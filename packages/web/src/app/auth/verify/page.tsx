"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { storage } from "@/lib/storage";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

// Module-level Set to track tokens currently being verified.
// This persists across React Strict Mode's unmount/remount cycle.
const verifyingTokens = new Set<string>();

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid or missing token");
      return;
    }

    // Prevent duplicate calls - if this token is already being verified, skip
    if (verifyingTokens.has(token)) {
      return;
    }

    // Mark token as being verified
    verifyingTokens.add(token);

    let isCancelled = false;

    const verify = async () => {
      try {
        const data = await api.verifyMagicLink(token);

        if (isCancelled) {
          return;
        }

        login(data.accessToken, data.refreshToken, data.user);
        setStatus("success");
        toast.success("Welcome back!");

        // Check for pending invitation before redirecting
        const pendingInvitation = await storage.getItem("pendingInvitation");
        if (pendingInvitation) {
          setTimeout(async () => {
            await storage.removeItem("pendingInvitation");
            router.push(`/invite/${pendingInvitation}`);
          }, 1500);
        } else {
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
        }
      } catch (err) {
        if (isCancelled) {
          return;
        }
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to verify link");
      } finally {
        // Clean up: remove token from Set after verification completes
        verifyingTokens.delete(token);
      }
    };

    verify();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
            {status === "loading" && (
              <>
                <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Verifying...
                </h1>
                <p className="text-cream/70">
                  Please wait while we sign you in.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Welcome back!
                </h1>
                <p className="text-cream/70">
                  You&apos;re signed in. Redirecting to dashboard...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-error" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Something went wrong
                </h1>
                <p className="text-cream/70 mb-6">{error}</p>
                <Button
                  onClick={() => router.push("/auth/login")}
                  className="w-full"
                >
                  Try Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
