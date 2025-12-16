"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(255),
  description: z.string().optional(),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  exchangeDate: z.string().optional(),
  wishlistDeadline: z.string().optional(),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

function TeamCard({ team }: { team: TeamWithRole }) {
  const statusVariant = {
    collecting_wishes: "warning",
    assigned: "success",
    completed: "gold",
  }[team.status] as "warning" | "success" | "gold";

  const statusLabel = {
    collecting_wishes: "Collecting Wishes",
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
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<
    string | null
  >(null);

  const {
    data: teams,
    isLoading: teamsLoading,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api.listTeams(),
    enabled: !!user,
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
        error instanceof Error ? error.message : "Failed to accept invitation"
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
        error instanceof Error ? error.message : "Failed to decline invitation"
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
      toast.success(`Team "${team.name}" created!`);
      router.push(`/dashboard/teams/${team.id}`);
    } catch (error) {
      console.error("Failed to create team:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create team"
      );
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push("/auth/login");
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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">🎄</span>
              <span className="font-display text-xl font-semibold text-cream">
                Secret Santa
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar name={user?.name || user?.email || "U"} size="sm" />
                <span className="text-cream/70 text-sm hidden sm:block">
                  {user?.name || user?.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
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
              <h2 className="text-xl font-display font-semibold text-cream">
                Pending Invitations
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
                              {invitation.invitedBy?.name ||
                                invitation.invitedBy?.email ||
                                "Unknown"}
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
                                Join Team
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
            <h1 className="text-3xl font-display font-bold text-cream mb-1">
              Your Teams
            </h1>
            <p className="text-cream/60">
              Manage your Secret Santa gift exchanges
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* Teams Grid */}
        {teams && teams.length > 0 ? (
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
                <h2 className="text-xl font-display font-semibold text-cream mb-2">
                  No teams yet
                </h2>
                <p className="text-cream/60 mb-6 max-w-md mx-auto">
                  Create your first Secret Santa team and invite friends,
                  family, or coworkers to join the gift exchange.
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Team
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
        title="Create a New Team"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateTeam)} className="space-y-4">
          <Input
            {...register("name")}
            label="Team Name"
            placeholder="Family Christmas 2024"
            error={errors.name?.message}
            autoFocus
          />

          <Textarea
            {...register("description")}
            label="Description (optional)"
            placeholder="Our annual family gift exchange..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("budgetMin")}
              type="number"
              label="Min Budget ($)"
              placeholder="20"
            />
            <Input
              {...register("budgetMax")}
              type="number"
              label="Max Budget ($)"
              placeholder="50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("wishlistDeadline")}
              type="date"
              label="Wishlist Deadline"
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
              Create Team
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
