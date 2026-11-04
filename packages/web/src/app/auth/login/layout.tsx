import { AppShell } from "@/components/app-shell";
import { shareImage } from "@/lib/share";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Sign in to Elf Match",
    description: "Sign in to organize or join a Secret Santa exchange.",
    images: [shareImage],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
