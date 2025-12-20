"use client";

import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasProcessed.current) {
      return;
    }

    const handleCallback = async () => {
      // Mark as processing immediately to prevent race conditions
      hasProcessed.current = true;
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage(
          error === "access_denied"
            ? "Sign-in was cancelled"
            : `Authentication failed: ${error}`
        );
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMessage("No authorization code received");
        return;
      }

      try {
        const response = await api.handleGoogleCallback(code);

        login(response.accessToken, response.refreshToken, response.user);
        setStatus("success");

        const redirectTo =
          sessionStorage.getItem("oauth_redirect") || state || "/dashboard";
        sessionStorage.removeItem("oauth_redirect");

        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      } catch (err) {
        console.error("Google OAuth callback error:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Authentication failed"
        );
      }
    };

    handleCallback();
  }, [searchParams, login, router]);

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
                  Signing you in with Google...
                </h1>
                <p className="text-cream/70">
                  Please wait while we complete your sign-in
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-8 h-8 text-success" />
                </motion.div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Welcome!
                </h1>
                <p className="text-cream/70">
                  You&apos;ve been signed in successfully
                </p>
                <p className="text-cream/50 text-sm mt-4">
                  Redirecting to your dashboard...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Sign-in Failed
                </h1>
                <p className="text-cream/70 mb-6">{errorMessage}</p>
                <div className="space-y-3">
                  <Link
                    href="/auth/login"
                    className="w-full inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-lg px-6 py-3 text-base bg-gradient-gold text-midnight hover:shadow-glow hover:scale-[1.02]"
                  >
                    Try Again
                  </Link>
                  <Link
                    href="/"
                    className="w-full inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-lg px-6 py-3 text-base bg-midnight-100 text-cream border border-gold/20 hover:border-gold/40 hover:bg-midnight-200"
                  >
                    Back to Home
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
