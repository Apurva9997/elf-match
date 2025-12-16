"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { storage } from "@/lib/storage";
import { motion } from "framer-motion";
import { CheckCircle, Gift, Loader2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "needsAuth"
  >("loading");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store the invitation token and redirect to login
      storage.setItem("pendingInvitation", token);
      setStatus("needsAuth");
      return;
    }

    const acceptInvitation = async () => {
      try {
        const result = await api.acceptInvitation(token);
        setTeamName(result.team.name);
        setStatus("success");
        toast.success(`Joined ${result.team.name}!`);

        // Redirect after a brief delay
        setTimeout(() => {
          router.push(`/dashboard/teams/${result.team.id}`);
        }, 2000);
      } catch (err) {
        setStatus("error");
        const errorMessage =
          err instanceof Error ? err.message : "Failed to accept invitation";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };

    acceptInvitation();
  }, [token, user, authLoading, router]);

  // Check for pending invitation after login
  useEffect(() => {
    if (user && status === "needsAuth") {
      const checkPendingInvitation = async () => {
        const pendingToken = await storage.getItem("pendingInvitation");
        if (pendingToken === token) {
          await storage.removeItem("pendingInvitation");
          setStatus("loading");

          try {
            const result = await api.acceptInvitation(token);
            setTeamName(result.team.name);
            setStatus("success");
            toast.success(`Joined ${result.team.name}!`);

            setTimeout(() => {
              router.push(`/dashboard/teams/${result.team.id}`);
            }, 2000);
          } catch (err) {
            setStatus("error");
            const errorMessage =
              err instanceof Error
                ? err.message
                : "Failed to accept invitation";
            setError(errorMessage);
            toast.error(errorMessage);
          }
        }
      };

      checkPendingInvitation();
    }
  }, [user, status, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="text-center">
          <CardContent className="pt-8 pb-6">
            {(status === "loading" || authLoading) && (
              <>
                <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Accepting Invitation...
                </h1>
                <p className="text-cream/70">
                  Please wait while we add you to the team.
                </p>
              </>
            )}

            {status === "needsAuth" && (
              <>
                <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
                  <Gift className="w-8 h-8 text-gold" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  You&apos;re Invited!
                </h1>
                <p className="text-cream/70 mb-6">
                  Sign in to accept this Secret Santa invitation.
                </p>
                <Button
                  onClick={() => router.push("/auth/login")}
                  className="w-full"
                >
                  Sign In to Accept
                </Button>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Welcome to the Team!
                </h1>
                <p className="text-cream/70">
                  You&apos;ve joined{" "}
                  <span className="text-gold font-medium">{teamName}</span>.
                  Redirecting...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-error" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Oops!
                </h1>
                <p className="text-cream/70 mb-6">{error}</p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
