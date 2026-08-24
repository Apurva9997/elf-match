"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      const redirectTo = searchParams.get("redirect_url") || "/dashboard";
      router.push(redirectTo);
      return;
    }

    // Show error if Clerk hasn't signed the user in within 8s
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, router, searchParams]);

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
            {!timedOut && (
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

            {isLoaded && isSignedIn && (
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

            {timedOut && !isSignedIn && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-display font-bold text-cream mb-2">
                  Sign-in Failed
                </h1>
                <p className="text-cream/70 mb-6">
                  This sign-in link may have expired or already been used.
                  Please request a new one.
                </p>
                <Link
                  href="/auth/login"
                  className="w-full inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-lg px-6 py-3 text-base bg-gradient-gold text-midnight hover:shadow-glow hover:scale-[1.02]"
                >
                  Back to Sign In
                </Link>
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
