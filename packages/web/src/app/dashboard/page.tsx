"use client";

import { Onboarding } from "@/components/onboarding";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";
import { api, type TeamWithRole } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatShortDate } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronRight,
  Gift,
  Loader2,
  LogOut,
  Mail,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createTeamSchema = z
  .object({
    name: z.string().min(1, "Team name is required").max(255),
    description: z.string().optional(),
    budgetMin: z.string().optional(),
    budgetMax: z.string().optional(),
    exchangeDate: z.string().optional(),
    wishlistDeadline: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const min = data.budgetMin ? Number(data.budgetMin) : null;
    const max = data.budgetMax ? Number(data.budgetMax) : null;
    if (min != null && (Number.isNaN(min) || min <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a budget above zero, or leave it blank.",
        path: ["budgetMin"],
      });
    }
    if (min != null && max != null && min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum cannot be higher than maximum.",
        path: ["budgetMin"],
      });
    }
    if (
      data.exchangeDate &&
      data.wishlistDeadline &&
      data.wishlistDeadline > data.exchangeDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wishlists are due after the exchange date.",
        path: ["wishlistDeadline"],
      });
    }
  });

type CreateTeamForm = z.infer<typeof createTeamSchema>;

function TeamCard({ team }: { team: TeamWithRole }) {
  const statusVariant = {
    collecting_wishes: "warning",
    assigned: "success",
    completed: "gold",
  }[team.status] as "warning" | "success" | "gold";

  const statusLabel = {
    collecting_wishes: "Building Wishlists",
    assigned: "Assigned",
    completed: "Completed",
  }[team.status];

  return (
    <Link href={`/dashboard/teams/${team.id}`}>
      <Card variant="interactive" className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{team.name}</CardTitle>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {team.description && (
            <p className="text-cream/60 text-sm mb-4 line-clamp-2">
              {team.description}
            </p>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-cream/50">
              {team.role === "admin" && (
                <Badge variant="gold" className="mr-2 text-xs">
                  Admin
                </Badge>
              )}
              {team.exchangeDate && (
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatShortDate(team.exchangeDate)}
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-cream/30" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    () => searchParams.get("new") === "1"
  );
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<
    string | null
  >(null);

  const {
    data: teams,
    isLoading: teamsLoading,
    isError: teamsError,
    error: teamsErrorDetail,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.listTeams(),
    enabled: !!user,
    retry: 1,
  });

  const {
    data: pendingInvitations,
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: ["pendingInvitations"],
    queryFn: () => api.listPendingInvitations(),
    enabled: !!user,
  });

  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId);
    try {
      const result = await api.acceptInvitationDirect(invitationId);
      await Promise.all([refetchTeams(), refetchInvitations()]);
      toast.success(`Joined ${result.team.name}!`);
      router.push(`/dashboard/teams/${result.team.id}`);
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't accept invitation. Please try again."
      );
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId);
    try {
      await api.declineInvitationDirect(invitationId);
      await refetchInvitations();
      toast.success("Invitation declined");
    } catch (error) {
      console.error("Failed to decline invitation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't decline invitation. Please try again."
      );
    } finally {
      setProcessingInvitation(null);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
  });

  const onCreateTeam = async (data: CreateTeamForm) => {
    try {
      const team = await api.createTeam({
        name: data.name,
        description: data.description,
        budgetMin: data.budgetMin ? parseFloat(data.budgetMin) : undefined,
        budgetMax: data.budgetMax ? parseFloat(data.budgetMax) : undefined,
        exchangeDate: data.exchangeDate || undefined,
        wishlistDeadline: data.wishlistDeadline || undefined,
      });
      setIsCreateModalOpen(false);
      reset();
      refetchTeams();
      track("exchange_created", { intent: "create", role: "admin" });
      toast.success(`${team.name} is ready. Invite the first person.`);
      router.push(`/dashboard/teams/${team.id}`);
    } catch (error) {
      console.error("Failed to create team:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't create exchange. Please try again."
      );
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!authLoading && !teamsLoading && user && teams) {
        try {
          // Get user preferences from backend
          const preferencesData = await api.getUserPreferences();
          const preferences = preferencesData.preferences || {};

          // Determine persona
          if (teams.length === 0) {
            // New user with no teams
            if (!preferences.onboarding?.new_user) {
              setIsOnboardingOpen(true);
            }
          } else {
            // User has teams - check if they're admin or member
            const firstTeam = teams[0];
            const persona = firstTeam.role === "admin" ? "admin" : "member";

            // Check if they've seen onboarding for this persona
            const hasSeenPersonaOnboarding =
              persona === "admin"
                ? preferences.onboarding?.admin
                : preferences.onboarding?.member;

            if (!hasSeenPersonaOnboarding) {
              setIsOnboardingOpen(true);
            }
          }
        } catch (error) {
          console.error("Failed to get user preferences:", error);
          // Fallback: show onboarding if we can't fetch preferences
          if (teams.length === 0) {
            setIsOnboardingOpen(true);
          }
        }
      }
    };

    checkOnboarding();
  }, [authLoading, teamsLoading, user, teams]);

  const handleOnboardingClose = async () => {
    setIsOnboardingOpen(false);

    try {
      // Mark onboarding as seen for the appropriate persona
      const persona = getOnboardingPersona();
      const updateData: { onboarding: Record<string, boolean> } = {
        onboarding: {},
      };

      if (persona === "new_user") {
        updateData.onboarding.new_user = true;
      } else if (persona === "admin") {
        updateData.onboarding.admin = true;
      } else if (persona === "member") {
        updateData.onboarding.member = true;
      }

      await api.updateUserPreferences(updateData);
    } catch (error) {
      console.error("Failed to update user preferences:", error);
      // Continue even if update fails
    }
  };

  const handleOnboardingCreateTeam = () => {
    setIsCreateModalOpen(true);
  };

  const handleOnboardingGoToTeam = (teamId: string) => {
    router.push(`/dashboard/teams/${teamId}`);
  };

  // Determine persona for onboarding
  const getOnboardingPersona = (): "new_user" | "admin" | "member" => {
    if (!teams || teams.length === 0) {
      return "new_user";
    }
    const firstTeam = teams[0];
    return firstTeam.role === "admin" ? "admin" : "member";
  };

  const createFromIntent = useRef(false);
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (
      createFromIntent.current ||
      authLoading ||
      teamsLoading ||
      !user ||
      searchParams.get("new") !== "1"
    ) {
      return;
    }
    createFromIntent.current = true;
    setIsOnboardingOpen(false);
    setIsCreateModalOpen(true);
    router.replace("/dashboard");
  }, [authLoading, teamsLoading, user, searchParams, router]);

  if (!authLoading && !user) {
    return null;
  }

  if (authLoading || teamsLoading || invitationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Onboarding */}
      <Onboarding
        isOpen={isOnboardingOpen}
        onClose={handleOnboardingClose}
        onCreateTeam={handleOnboardingCreateTeam}
        onGoToTeam={handleOnboardingGoToTeam}
        persona={getOnboardingPersona()}
        firstTeamId={teams && teams.length > 0 ? teams[0].id : undefined}
        firstTeamName={teams && teams.length > 0 ? teams[0].name : undefined}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="font-display text-xl text-evergreen">
              Elf Match
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/profile"
                aria-label="Your profile"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Avatar name={user?.name || user?.email || "U"} size="sm" />
                <span className="text-cream/70 text-sm hidden sm:block">
                  {user?.name || user?.email}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-display text-evergreen">
                Invitations waiting for you
              </h2>
              <Badge variant="gold" className="ml-2">
                {pendingInvitations.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {pendingInvitations.map((invitation, index) => (
                <motion.div
                  key={invitation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="border-gold/30 bg-midnight/50">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-cream">
                            {invitation.teamName}
                          </h3>
                          {invitation.teamDescription && (
                            <p className="text-cream/60 text-sm mt-1 line-clamp-1">
                              {invitation.teamDescription}
                            </p>
                          )}
                          <p className="text-cream/50 text-xs mt-2">
                            Invited by{" "}
                            <span className="text-cream/70">
                              {invitation.invitedBy?.name || "Unknown"}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleDeclineInvitation(invitation.id)
                            }
                            disabled={processingInvitation === invitation.id}
                          >
                            {processingInvitation === invitation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Decline
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAcceptInvitation(invitation.id)
                            }
                            disabled={processingInvitation === invitation.id}
                          >
                            {processingInvitation === invitation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Join
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display text-evergreen mb-1">
              Your exchanges
            </h1>
            <p className="text-ink-soft">
              Secret Santa exchanges on this account
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create an exchange
          </Button>
        </div>

        {/* Teams Grid */}
        {teamsError ? (
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-display font-semibold text-cream mb-2">
                Couldn&apos;t load your exchanges
              </h2>
              <p className="text-cream/60 mb-6 max-w-md mx-auto">
                {teamsErrorDetail instanceof Error
                  ? teamsErrorDetail.message
                  : "The server didn't respond. Please try again."}
              </p>
              <Button onClick={() => refetchTeams()}>Try again</Button>
            </CardContent>
          </Card>
        ) : teams && teams.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <TeamCard team={team} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
                  <Gift className="w-8 h-8 text-gold" />
                </div>
                <h2 className="text-xl font-display text-evergreen mb-2">
                  No exchanges yet
                </h2>
                <p className="text-ink-soft mb-6 max-w-md mx-auto">
                  Name one, set a date, and invite people by email. Budgets are
                  in rupees.
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Exchange
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      {/* Create Team Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create a New Exchange"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateTeam)} className="space-y-4">
          <Input
            {...register("name")}
            label="Exchange name"
            id="exchange-name"
            placeholder="Cousins, December"
            error={errors.name?.message}
            autoFocus
          />

          <Textarea
            {...register("description")}
            label="Description (optional)"
            placeholder="Our annual family gift exchange..."
          />

          <p className="text-sm text-ink-soft">Budgets are in rupees. Leave both blank if the group has no range.</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("budgetMin")}
              type="number"
              label="Min budget, rupees"
              placeholder="500"
              error={errors.budgetMin?.message}
            />
            <Input
              {...register("budgetMax")}
              type="number"
              label="Max budget, rupees"
              placeholder="2000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("wishlistDeadline")}
              type="date"
              label="Wishlist Deadline"
              error={errors.wishlistDeadline?.message}
            />
            <Input
              {...register("exchangeDate")}
              type="date"
              label="Exchange Date"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create exchange
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
