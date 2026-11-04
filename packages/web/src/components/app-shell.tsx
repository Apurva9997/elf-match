"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import {
  invitePath,
  inviteWasNudged,
  rememberedInvite,
} from "@/lib/pending-invite";

function AuthWrapper({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (user && !pathname.startsWith("/invite/")) {
      const token = rememberedInvite();
      if (token && !inviteWasNudged() && !sent.current) {
        sent.current = true;
        router.replace(invitePath(token));
        return;
      }
    }
    setReady(true);
  }, [isLoading, user, pathname, router]);

  // A signed-out visitor is not waiting on an account. Hold only while
  // Clerk is resolving a session that might still be signed in, or while
  // a remembered invitation is about to redirect.
  const waitingForInvite =
    Boolean(user) && !ready && !pathname.startsWith("/invite/");
  if ((isLoading && user !== null) || waitingForInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MotionConfig reducedMotion="user">
            <AuthWrapper>{children}</AuthWrapper>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "#FFFCF6",
                  border: "1px solid #DDD4C4",
                  color: "#1C1915",
                },
              }}
            />
          </MotionConfig>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
