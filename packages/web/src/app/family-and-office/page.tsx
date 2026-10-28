import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Secret Santa for a family or an office that is not in one room",
  description:
    "One Elf Match exchange for cousins who should not draw each other, or an office that cannot pass a hat. A shareable invite link, exclusions, and a private draw.",
  alternates: { canonical: "https://elfmatch.com/family-and-office" },
  openGraph: {
    title: "Secret Santa for a family or an office",
    description:
      "Keep couples apart, invite people who are not in the room, and send each person only their own match.",
    url: "https://elfmatch.com/family-and-office",
  },
};

export default function FamilyAndOfficePage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto max-w-page px-4 pb-16 pt-10 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-cranberry">
          Family or office
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl text-evergreen sm:text-5xl">
          One exchange, wherever people actually are.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Elf Match is the same tool for a family draw and an office draw. The
          difference is who must not match, and who is not in the room when the
          names are drawn.
        </p>

        <div className="mt-12 grid gap-10 border-t border-rule pt-10 md:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl text-ink">A family</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Add an exclusion for each couple, or for siblings who already buy
              for each other. The rule runs both ways. You can preview the
              pairings and generate another set before anyone is emailed.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-ink">An office</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Copy one invite link into the group chat, or send email
              invitations, including to people in another city. People who
              have not joined are not in the draw. After you confirm,
              each person sees only their own recipient, plus that
              person&apos;s wishlist and delivery address. No one else in the
              office can read either.
            </p>
          </section>
        </div>

        <p className="mt-10 max-w-2xl text-ink-soft">
          A wishlist is private until the draw, then visible only to the assigned
          giver. A draw needs at least three people who have joined. Budgets
          are in rupees.
        </p>
        <Link
          href="/auth/login?intent=create"
          className="mt-8 inline-flex bg-cranberry px-5 py-3 font-semibold text-ivory hover:bg-cranberry-deep"
        >
          Create an exchange
        </Link>
      </main>
      <PublicFooter />
    </div>
  );
}
