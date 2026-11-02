import { shareImage } from "@/lib/share";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your exchanges",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your Elf Match exchanges",
    description: "Secret Santa, drawn in private.",
    images: [shareImage],
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
