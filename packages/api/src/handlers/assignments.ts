import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  assignments,
  db,
  exclusions,
  teamMembers,
  teams,
} from "../db/index.js";
import { getUserFromEvent } from "../lib/auth.js";
import { sendAssignmentEmail } from "../lib/email.js";
import {
  error,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from "../lib/response.js";

const updateAssignmentSchema = z.object({
  giftStatus: z.enum(["pending", "purchased", "shipped", "delivered"]),
});

const confirmAssignmentSchema = z.object({
  assignments: z
    .array(
      z.object({
        giverId: z.string().uuid(),
        receiverId: z.string().uuid(),
      })
    )
    .optional(),
});

async function getMembershipForTeam(userId: string, teamId: string) {
  return db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.invitationStatus, "accepted")
    ),
  });
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate valid Secret Santa assignments considering exclusions
function generateAssignments(
  memberIds: string[],
  exclusionPairs: Set<string>
): Map<string, string> | null {
  const maxAttempts = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const givers = [...memberIds];
    const receivers = shuffle([...memberIds]);

    let valid = true;
    const assignments = new Map<string, string>();

    for (let i = 0; i < givers.length; i++) {
      const giver = givers[i];
      const receiver = receivers[i];

      // Check if giver is assigned to themselves
      if (giver === receiver) {
        valid = false;
        break;
      }

      // Check exclusion rules
      const exclusionKey1 = `${giver}:${receiver}`;
      const exclusionKey2 = `${receiver}:${giver}`;

      if (
        exclusionPairs.has(exclusionKey1) ||
        exclusionPairs.has(exclusionKey2)
      ) {
        valid = false;
        break;
      }

      assignments.set(giver, receiver);
    }

    if (valid) {
      return assignments;
    }
  }

  return null; // Could not find valid assignment
}

export async function triggerAssignment(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    // Check admin membership
    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!adminMembership) {
      return forbidden("Only admins can trigger assignments");
    }

    // Check if assignments already exist
    const existingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });

    if (existingAssignments.length > 0) {
      return error("Assignments have already been made for this team", 400);
    }

    // Get all accepted members
    const members = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: {
        user: true,
      },
    });

    if (members.length < 3) {
      return error("Need at least 3 members to create assignments", 400);
    }

    // Get exclusions
    const teamExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
    });

    // Build exclusion pairs set
    const exclusionPairs = new Set<string>();
    for (const excl of teamExclusions) {
      exclusionPairs.add(`${excl.member1Id}:${excl.member2Id}`);
      if (excl.bidirectional) {
        exclusionPairs.add(`${excl.member2Id}:${excl.member1Id}`);
      }
    }

    // Parse request body to check if preview assignments are provided
    const body = JSON.parse(event.body || "{}");
    const parsed = confirmAssignmentSchema.safeParse(body);

    let assignmentMap: Map<string, string> | null = null;

    // If preview assignments are provided, validate and use them
    if (parsed.success && parsed.data.assignments) {
      const memberIds = new Set(members.map((m) => m.id));
      const providedAssignments = parsed.data.assignments;

      // Validate all members are included
      const providedGiverIds = new Set(
        providedAssignments.map((a) => a.giverId)
      );
      const providedReceiverIds = new Set(
        providedAssignments.map((a) => a.receiverId)
      );

      if (
        providedGiverIds.size !== memberIds.size ||
        providedReceiverIds.size !== memberIds.size ||
        ![...memberIds].every((id) => providedGiverIds.has(id)) ||
        ![...memberIds].every((id) => providedReceiverIds.has(id))
      ) {
        return error(
          "Provided assignments must include all team members exactly once",
          400
        );
      }

      // Validate assignments don't violate exclusions or self-assignment
      assignmentMap = new Map<string, string>();
      for (const assignment of providedAssignments) {
        // Check self-assignment
        if (assignment.giverId === assignment.receiverId) {
          return error(
            `Invalid assignment: member cannot be assigned to themselves`,
            400
          );
        }

        // Check exclusions
        const exclusionKey1 = `${assignment.giverId}:${assignment.receiverId}`;
        const exclusionKey2 = `${assignment.receiverId}:${assignment.giverId}`;
        if (
          exclusionPairs.has(exclusionKey1) ||
          exclusionPairs.has(exclusionKey2)
        ) {
          return error(`Invalid assignment: violates exclusion rule`, 400);
        }

        assignmentMap.set(assignment.giverId, assignment.receiverId);
      }
    } else {
      // Generate new assignments if none provided
      const memberIds = members.map((m) => m.id);
      assignmentMap = generateAssignments(memberIds, exclusionPairs);

      if (!assignmentMap) {
        return error(
          "Could not generate valid assignments. This may happen if exclusion rules are too restrictive.",
          400
        );
      }
    }

    // Get team for email
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound("Team not found");
    }

    // Save assignments and send emails
    const assignmentRecords = [];
    for (const [giverId, receiverId] of assignmentMap) {
      const [assignment] = await db
        .insert(assignments)
        .values({
          teamId,
          giverId,
          receiverId,
        })
        .returning();
      assignmentRecords.push(assignment);

      // Send email to giver
      const giver = members.find((m) => m.id === giverId);
      const receiver = members.find((m) => m.id === receiverId);

      if (giver?.user?.email && receiver?.user?.name) {
        try {
          await sendAssignmentEmail(
            giver.user.email,
            team.name,
            receiver.user.name
          );
        } catch (emailErr) {
          console.error(
            `Failed to send assignment email to ${giver.user.email}:`,
            emailErr
          );
        }
      }
    }

    // Update team status
    await db
      .update(teams)
      .set({ status: "assigned", updatedAt: new Date() })
      .where(eq(teams.id, teamId));

    return success({
      message: "Assignments created successfully",
      count: assignmentRecords.length,
    });
  } catch (err) {
    console.error("Error triggering assignment:", err);
    return serverError("Failed to create assignments");
  }
}

export async function getAssignment(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    // Find the assignment where this user is the giver
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.teamId, teamId),
        eq(assignments.giverId, membership.id)
      ),
      with: {
        receiver: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return success({
        assigned: false,
        message: "Assignments have not been made yet.",
      });
    }

    return success({
      assigned: true,
      giftee: {
        name: assignment.receiver.user?.name || "Unknown",
        avatarUrl: assignment.receiver.user?.avatarUrl,
      },
      giftStatus: assignment.giftStatus,
      revealedAt: assignment.revealedAt,
    });
  } catch (err) {
    console.error("Error getting assignment:", err);
    return serverError("Failed to get assignment");
  }
}

export async function updateAssignment(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden("You are not a member of this team");
    }

    const body = JSON.parse(event.body || "{}");
    const parsed = updateAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return error("Invalid assignment data", 400, "VALIDATION_ERROR");
    }

    const { giftStatus } = parsed.data;

    // Find and update the assignment
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.teamId, teamId),
        eq(assignments.giverId, membership.id)
      ),
    });

    if (!assignment) {
      return notFound("Assignment not found");
    }

    const [updated] = await db
      .update(assignments)
      .set({ giftStatus })
      .where(eq(assignments.id, assignment.id))
      .returning();

    return success(updated);
  } catch (err) {
    console.error("Error updating assignment:", err);
    return serverError("Failed to update assignment");
  }
}

// Preview assignments without saving - allows admin to review before confirming
export async function previewAssignment(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error("Team ID required", 400);

    // Check admin membership
    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, "accepted"),
        eq(teamMembers.role, "admin")
      ),
    });

    if (!adminMembership) {
      return forbidden("Only admins can preview assignments");
    }

    // Check if assignments already exist
    const existingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });

    if (existingAssignments.length > 0) {
      return error("Assignments have already been made for this team", 400);
    }

    // Get all accepted members
    const members = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, "accepted")
      ),
      with: {
        user: true,
      },
    });

    if (members.length < 3) {
      return error("Need at least 3 members to create assignments", 400);
    }

    // Get exclusions
    const teamExclusions = await db.query.exclusions.findMany({
      where: eq(exclusions.teamId, teamId),
    });

    // Build exclusion pairs set
    const exclusionPairs = new Set<string>();
    for (const excl of teamExclusions) {
      exclusionPairs.add(`${excl.member1Id}:${excl.member2Id}`);
      if (excl.bidirectional) {
        exclusionPairs.add(`${excl.member2Id}:${excl.member1Id}`);
      }
    }

    // Generate assignments (but don't save)
    const memberIds = members.map((m) => m.id);
    const assignmentMap = generateAssignments(memberIds, exclusionPairs);

    if (!assignmentMap) {
      return error(
        "Could not generate valid assignments. This may happen if exclusion rules are too restrictive.",
        400
      );
    }

    // Build preview response with member details
    const preview = [];
    for (const [giverId, receiverId] of assignmentMap) {
      const giver = members.find((m) => m.id === giverId);
      const receiver = members.find((m) => m.id === receiverId);

      preview.push({
        giver: {
          id: giverId,
          name: giver?.user?.name || giver?.invitedEmail || "Unknown",
          avatarUrl: giver?.user?.avatarUrl,
        },
        receiver: {
          id: receiverId,
          name: receiver?.user?.name || receiver?.invitedEmail || "Unknown",
          avatarUrl: receiver?.user?.avatarUrl,
        },
      });
    }

    return success({
      preview,
      totalAssignments: preview.length,
      exclusionsApplied: teamExclusions.length,
    });
  } catch (err) {
    console.error("Error previewing assignment:", err);
    return serverError("Failed to preview assignments");
  }
}
