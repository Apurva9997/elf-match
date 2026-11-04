import { AppShell } from "@/components/app-shell";
import { shareImage } from "@/lib/share";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Signing in to Elf Match",
    images: [shareImage],
  },
};

export default function SsoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
