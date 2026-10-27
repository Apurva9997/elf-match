"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { storage } from "@/lib/storage";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
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
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-evergreen-soft">
                  <Loader2 className="h-8 w-8 animate-spin text-evergreen" />
                </div>
                <h1 className="mb-2 font-display text-2xl text-evergreen">Opening the invitation</h1>
                <p className="text-ink-soft">Adding you to the exchange.</p>
              </>
            )}

            {status === "needsAuth" && (
              <>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
                  Invitation
                </p>
                <h1 className="mb-2 font-display text-3xl text-evergreen">
                  You have a seat at this exchange.
                </h1>
                <p className="mb-6 text-ink-soft">
                  Sign in with the email that received this link. You can write a wishlist after you join.
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      `/auth/login?redirect=${encodeURIComponent(`/invite/${token}`)}`
                    )
                  }
                  className="w-full"
                >
                  Sign in to join
                </Button>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h1 className="mb-2 font-display text-2xl text-evergreen">You&apos;re in</h1>
                <p className="text-ink-soft">
                  Opening{" "}
                  <span className="font-medium text-ink">{teamName}</span>.
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-error" />
                </div>
                <h1 className="mb-2 font-display text-2xl text-evergreen">
                  This invitation did not open
                </h1>
                <p className="mb-6 text-ink-soft">{error}</p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full"
                >
                  Go to your exchanges
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
