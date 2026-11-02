import { HomePage } from "@/components/home-page";
import { shareImage } from "@/lib/share";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Secret Santa generator for a private draw | Elf Match",
  },
  description:
    "Free Secret Santa generator. Set a budget and exchange date, invite people by link or email, keep couples apart, collect wishlists, and send each person a private assignment.",
  alternates: {
    canonical: "https://elfmatch.com",
  },
  openGraph: {
    title: "Secret Santa generator for a real gift exchange",
    description:
      "Set a budget and date, invite by link or email, collect wishlists, and draw names privately.",
    url: "https://elfmatch.com",
    images: [shareImage],
  },
};

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Elf Match",
  url: "https://elfmatch.com",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Free organizer for Secret Santa and other gift exchanges. Set a budget and date, invite people by link or email, keep particular pairs from matching, collect wishlists, and send private assignments.",
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <HomePage />
    </>
  );
}
