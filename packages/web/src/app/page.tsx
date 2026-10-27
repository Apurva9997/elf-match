import { HomePage } from "@/components/home-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Secret Santa Generator - Create Gift Exchanges in Minutes",
  description:
    "Create your free Secret Santa gift exchange in 2 minutes. Perfect for office parties, family gatherings & friend groups. Features wishlists, exclusion rules & automatic matching.",
  alternates: {
    canonical: "https://elfmatch.com",
  },
};

// Server component wrapper for SEO - actual content rendered by client component
// but search engines will see the static HTML structure
export default function Page() {
  return <HomePage />;
}
