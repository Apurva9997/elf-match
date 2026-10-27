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
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-evergreen-soft">
                  <Loader2 className="h-8 w-8 animate-spin text-evergreen" />
                </div>
                <h1 className="mb-2 font-display text-2xl text-evergreen">Checking the code</h1>
                <p className="text-ink-soft">Please wait while we sign you in.</p>
              </>
            )}

            {isLoaded && isSignedIn && (
              <>
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h1 className="mb-2 font-display text-2xl text-evergreen">Signed in</h1>
                <p className="text-ink-soft">Opening your exchanges.</p>
              </>
            )}

            {timedOut && !isSignedIn && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="mb-2 font-display text-2xl text-evergreen">That code did not work</h1>
                <p className="mb-6 text-ink-soft">
                  The link may have expired or already been used. Request a new code.
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex w-full items-center justify-center bg-evergreen px-6 py-3 font-semibold text-ivory hover:bg-evergreen-deep"
                >
                  Back to sign in
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
          <Loader2 className="h-8 w-8 animate-spin text-evergreen" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
