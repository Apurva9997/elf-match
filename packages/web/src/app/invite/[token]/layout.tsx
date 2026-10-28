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
    },
    twitter: {
      card: "summary",
      title: copy.title,
      description: copy.description,
    },
  };
}

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
