import { invitePreviewCopy } from "../../../../../api/src/lib/invite-preview";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Chat apps fetch this from the HTML they scrape. An absolute production
// URL survives a local metadataBase, which would otherwise rewrite a
// relative image to localhost and leave the card without a picture.
const SANTA_PREVIEW = "https://elfmatch.com/santa-preview.jpg";

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
      images: [
        {
          url: SANTA_PREVIEW,
          width: 630,
          height: 630,
          type: "image/jpeg",
          alt: "Elf Match invitation",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [SANTA_PREVIEW],
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
