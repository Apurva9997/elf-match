import { shareImage } from "@/lib/share";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checking the sign-in code",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Checking the sign-in code",
    images: [shareImage],
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
