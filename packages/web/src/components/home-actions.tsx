"use client";

import { AuthContext } from "@/lib/auth-context";
import Link from "next/link";
import { useContext } from "react";

export function HomeActions() {
  const auth = useContext(AuthContext);
  const resolved = Boolean(auth && !auth.isLoading);

  if (resolved && auth?.isAuthenticated) {
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

  if (!resolved) {
    return <div className="mt-8 h-12 w-48 bg-ivory-deep" aria-hidden />;
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
        href="/auth/login?intent=join"
        className="mt-3 block text-base font-semibold text-evergreen underline-offset-2 hover:underline"
      >
        I have an invitation
      </Link>
    </div>
  );
}
