import { AppShell } from "@/components/app-shell";
import { shareImage } from "@/lib/share";
import { invitePreviewCopy } from "../../../../../api/src/lib/invite-preview";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const copy = await invitePreviewCopy(params.token);
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: false, follow: false },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: `/invite/${params.token}`,
      siteName: "Elf Match",
      type: "website",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [shareImage],
    },
  };
}

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
