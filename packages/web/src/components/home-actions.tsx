"use client";

import { useAuth } from "@/lib/auth-context";
import { invitePath, rememberedInvite } from "@/lib/pending-invite";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeActions() {
  const { isAuthenticated, isLoading } = useAuth();
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  useEffect(() => {
    setPendingInvite(rememberedInvite());
  }, []);
  const joinHref = pendingInvite
    ? `/auth/login?intent=join&redirect=${encodeURIComponent(invitePath(pendingInvite))}`
    : "/auth/login?intent=join";

  if (isLoading) {
    return (
      <div className="mt-8 h-12 w-48 bg-ivory-deep" aria-hidden />
    );
  }

  if (isAuthenticated) {
    return (
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center bg-cranberry px-5 py-3 text-base font-semibold text-ivory hover:bg-cranberry-deep"
        >
          Open your exchanges
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Link
        href="/auth/login?intent=create"
        className="inline-flex items-center justify-center bg-cranberry px-5 py-3 text-base font-semibold text-ivory hover:bg-cranberry-deep"
      >
        Create an exchange
      </Link>
      <Link
        href={joinHref}
        className="mt-3 block text-base font-semibold text-evergreen underline-offset-2 hover:underline"
      >
        I have an invitation
      </Link>
    </div>
  );
}
