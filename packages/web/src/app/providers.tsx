"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import {
  invitePath,
  inviteWasNudged,
  rememberedInvite,
} from "@/lib/pending-invite";
import { Loader2 } from "lucide-react";

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

  const waitingForInvite =
    Boolean(user) && !ready && !pathname.startsWith("/invite/");
  if (isLoading || waitingForInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <AuthWrapper>{children}</AuthWrapper>
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  );
}
