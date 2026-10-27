import { HomePage } from "@/components/home-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Secret Santa generator for a private draw | Elf Match",
  },
  description:
    "Free Secret Santa generator. Set a budget and exchange date, invite people by email, keep couples apart, collect wishlists, and send each person a private assignment.",
  alternates: {
    canonical: "https://elfmatch.com",
  },
  openGraph: {
    title: "Secret Santa generator for a real gift exchange",
    description:
      "Set a budget and date, invite by email, collect wishlists, and draw names privately.",
    url: "https://elfmatch.com",
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
    "Free organizer for Secret Santa and other gift exchanges. Set a budget and date, invite people by email, keep particular pairs from matching, collect wishlists, and send private assignments.",
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to organize a Secret Santa exchange",
  description:
    "Create an Elf Match exchange, invite people by email, add exclusions, and send a private draw.",
  step: [
    {
      "@type": "HowToStep",
      name: "Name the exchange",
      text: "Enter a name, an optional budget range, a wishlist deadline, and the exchange date.",
    },
    {
      "@type": "HowToStep",
      name: "Invite by email",
      text: "Add email addresses. Each person joins from the invitation and can write a wishlist.",
    },
    {
      "@type": "HowToStep",
      name: "Keep pairs apart",
      text: "Add exclusions so particular people are not assigned to each other.",
    },
    {
      "@type": "HowToStep",
      name: "Send the private draw",
      text: "Preview the assignments, then confirm. Each person receives only their own recipient.",
    },
  ],
};

// Server component wrapper for SEO - actual content rendered by client component
// but search engines will see the static HTML structure
export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <HomePage />
    </>
  );
}
