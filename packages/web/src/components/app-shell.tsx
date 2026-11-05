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
  const sent = useRef(false);

  useEffect(() => {
    if (isLoading || !user || pathname.startsWith("/invite/")) return;
    const token = rememberedInvite();
    if (!token || inviteWasNudged() || sent.current) return;
    sent.current = true;
    router.replace(invitePath(token));
  }, [isLoading, user, pathname, router]);

  // Paint the page while Clerk is still resolving. Holding the document
  // here, then redirecting once the session arrived, fought the login
  // page's own redirect to the dashboard.
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
