import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { shareImage } from "@/lib/share";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Page not found",
    description: "That page is not on Elf Match.",
    images: [shareImage],
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto max-w-page px-4 py-20 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
          404
        </p>
        <h1 className="mt-3 max-w-xl font-display text-4xl text-evergreen sm:text-5xl">
          That page is not on the desk.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-ink-soft">
          The link may be old. An exchange, an invitation, and a draw
          are never listed here.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex bg-cranberry px-5 py-3 font-semibold text-ivory hover:bg-cranberry-deep"
          >
            Back to Elf Match
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex px-5 py-3 font-semibold text-evergreen underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
