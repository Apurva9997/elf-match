'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Users,
  Gift,
  Calendar,
  ChevronRight,
  Loader2,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, type TeamWithRole } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatShortDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255),
  description: z.string().optional(),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  exchangeDate: z.string().optional(),
  wishlistDeadline: z.string().optional(),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

function TeamCard({ team }: { team: TeamWithRole }) {
  const statusVariant = {
    collecting_wishes: 'warning',
    assigned: 'success',
    completed: 'gold',
  }[team.status] as 'warning' | 'success' | 'gold';

  const statusLabel = {
    collecting_wishes: 'Collecting Wishes',
    assigned: 'Assigned',
    completed: 'Completed',
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
              {team.role === 'admin' && (
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

  const { data: teams, isLoading: teamsLoading, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.listTeams(),
    enabled: !!user,
  });

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
      refetch();
      router.push(`/dashboard/teams/${team.id}`);
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    router.push('/auth/login');
    return null;
  }

  if (authLoading || teamsLoading) {
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
                <Avatar name={user?.name || user?.email || 'U'} size="sm" />
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
                  Create your first Secret Santa team and invite friends, family,
                  or coworkers to join the gift exchange.
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
            {...register('name')}
            label="Team Name"
            placeholder="Family Christmas 2024"
            error={errors.name?.message}
            autoFocus
          />

          <Textarea
            {...register('description')}
            label="Description (optional)"
            placeholder="Our annual family gift exchange..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('budgetMin')}
              type="number"
              label="Min Budget ($)"
              placeholder="20"
            />
            <Input
              {...register('budgetMax')}
              type="number"
              label="Max Budget ($)"
              placeholder="50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register('wishlistDeadline')}
              type="date"
              label="Wishlist Deadline"
            />
            <Input
              {...register('exchangeDate')}
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

