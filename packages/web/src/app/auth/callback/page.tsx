"use client";

import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const provider = searchParams.get("provider") || detectProvider();

      // Handle OAuth errors
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
        let response;

        if (provider === "google") {
          response = await api.handleGoogleCallback(code);
        } else if (provider === "apple") {
          // Apple also sends id_token and user info in some cases
          const idToken = searchParams.get("id_token") || undefined;
          const user = searchParams.get("user") || undefined;
          response = await api.handleAppleCallback(code, idToken, user);
        } else {
          throw new Error("Unknown OAuth provider");
        }

        // Log in the user
        login(response.accessToken, response.refreshToken, response.user);
        setStatus("success");

        // Get redirect URL from session storage or state parameter
        const redirectTo =
          sessionStorage.getItem("oauth_redirect") || state || "/dashboard";
        sessionStorage.removeItem("oauth_redirect");

        // Redirect after a brief success animation
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      } catch (err) {
        console.error("OAuth callback error:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Authentication failed"
        );
      }
    };

    handleCallback();
  }, [searchParams, login, router]);

  // Detect provider from referrer or URL path
  function detectProvider(): string {
    const referrer = document.referrer;
    if (referrer.includes("google")) return "google";
    if (referrer.includes("apple")) return "apple";

    // Check if it's in the URL path (for Next.js routing)
    const path = window.location.pathname;
    if (path.includes("google")) return "google";
    if (path.includes("apple")) return "apple";

    // Default to google as it's more common
    return "google";
  }

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
                  Signing you in...
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

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
