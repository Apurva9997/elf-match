"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export function HomeActions() {
  const { isAuthenticated, isLoading } = useAuth();

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
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link
        href="/auth/login?intent=create"
        className="inline-flex items-center justify-center bg-cranberry px-5 py-3 text-base font-semibold text-ivory hover:bg-cranberry-deep"
      >
        Create an exchange
      </Link>
      <Link
        href="/auth/login?intent=join"
        className="inline-flex items-center justify-center px-2 py-3 text-base font-semibold text-evergreen underline-offset-2 hover:underline"
      >
        I have an invitation
      </Link>
    </div>
  );
}
