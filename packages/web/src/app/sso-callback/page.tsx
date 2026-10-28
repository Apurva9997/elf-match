"use client";

import { Button } from "@/components/ui/button";
import { invitePath, rememberedInvite } from "@/lib/pending-invite";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SSOCallbackPage() {
  const [stalled, setStalled] = useState(false);
  const [returnHref, setReturnHref] = useState("/auth/login");

  useEffect(() => {
    const token = rememberedInvite();
    if (token) {
      setReturnHref(
        `/auth/login?intent=join&redirect=${encodeURIComponent(invitePath(token))}`
      );
    }
    const timer = window.setTimeout(() => setStalled(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-evergreen" />
        <h1 className="mt-6 font-display text-2xl text-evergreen">
          {stalled ? "Sign-in is taking longer than usual" : "Signing you in"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {stalled
            ? "The page stayed here after Google or Apple. Go back and try the email code instead."
            : "This takes a moment. You will land on the invitation if you opened one."}
        </p>
        {stalled && (
          <Link href={returnHref} className="mt-6 inline-block">
            <Button>Back to sign in</Button>
          </Link>
        )}
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
