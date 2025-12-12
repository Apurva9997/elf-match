import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, teams, teamMembers, assignments, exclusions } from '../db/index.js';
import { getUserFromEvent } from '../lib/auth.js';
import { sendAssignmentEmail } from '../lib/email.js';
import { success, error, unauthorized, forbidden, notFound, serverError } from '../lib/response.js';

const updateAssignmentSchema = z.object({
  giftStatus: z.enum(['pending', 'purchased', 'shipped', 'delivered']),
});

async function getMembershipForTeam(userId: string, teamId: string) {
  return db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.invitationStatus, 'accepted')
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
      
      if (exclusionPairs.has(exclusionKey1) || exclusionPairs.has(exclusionKey2)) {
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
    if (!teamId) return error('Team ID required', 400);

    // Check admin membership
    const adminMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.invitationStatus, 'accepted'),
        eq(teamMembers.role, 'admin')
      ),
    });

    if (!adminMembership) {
      return forbidden('Only admins can trigger assignments');
    }

    // Check if assignments already exist
    const existingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.teamId, teamId),
    });

    if (existingAssignments.length > 0) {
      return error('Assignments have already been made for this team', 400);
    }

    // Get all accepted members
    const members = await db.query.teamMembers.findMany({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, 'accepted')
      ),
      with: {
        user: true,
      },
    });

    if (members.length < 3) {
      return error('Need at least 3 members to create assignments', 400);
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

    // Generate assignments
    const memberIds = members.map((m) => m.id);
    const assignmentMap = generateAssignments(memberIds, exclusionPairs);

    if (!assignmentMap) {
      return error(
        'Could not generate valid assignments. This may happen if exclusion rules are too restrictive.',
        400
      );
    }

    // Get team for email
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return notFound('Team not found');
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
          console.error(`Failed to send assignment email to ${giver.user.email}:`, emailErr);
        }
      }
    }

    // Update team status
    await db
      .update(teams)
      .set({ status: 'assigned', updatedAt: new Date() })
      .where(eq(teams.id, teamId));

    return success({
      message: 'Assignments created successfully',
      count: assignmentRecords.length,
    });
  } catch (err) {
    console.error('Error triggering assignment:', err);
    return serverError('Failed to create assignments');
  }
}

export async function getAssignment(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error('Team ID required', 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden('You are not a member of this team');
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
        message: 'Assignments have not been made yet.',
      });
    }

    return success({
      assigned: true,
      giftee: {
        name: assignment.receiver.user?.name || 'Unknown',
        avatarUrl: assignment.receiver.user?.avatarUrl,
      },
      giftStatus: assignment.giftStatus,
      revealedAt: assignment.revealedAt,
    });
  } catch (err) {
    console.error('Error getting assignment:', err);
    return serverError('Failed to get assignment');
  }
}

export async function updateAssignment(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> {
  try {
    const user = await getUserFromEvent(event);
    if (!user) return unauthorized();

    const teamId = event.pathParameters?.teamId;
    if (!teamId) return error('Team ID required', 400);

    const membership = await getMembershipForTeam(user.id, teamId);
    if (!membership) {
      return forbidden('You are not a member of this team');
    }

    const body = JSON.parse(event.body || '{}');
    const parsed = updateAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return error('Invalid assignment data', 400, 'VALIDATION_ERROR');
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
      return notFound('Assignment not found');
    }

    const [updated] = await db
      .update(assignments)
      .set({ giftStatus })
      .where(eq(assignments.id, assignment.id))
      .returning();

    return success(updated);
  } catch (err) {
    console.error('Error updating assignment:', err);
    return serverError('Failed to update assignment');
  }
}

