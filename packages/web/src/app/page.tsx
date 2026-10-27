import { HomePage } from "@/components/home-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organize a Secret Santa exchange",
  description:
    "Elf Match helps you set a budget and date, invite people by email, keep pairs apart, collect wishlists, and send each person a private gift assignment.",
  alternates: {
    canonical: "https://elfmatch.com",
  },
};

// Server component wrapper for SEO - actual content rendered by client component
// but search engines will see the static HTML structure
export default function Page() {
  return <HomePage />;
}
