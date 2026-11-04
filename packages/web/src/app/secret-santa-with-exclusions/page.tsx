import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { shareImage } from "@/lib/share";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Secret Santa with exclusions",
  description:
    "Keep couples, siblings, or last year’s pairs out of a Secret Santa draw. An Elf Match exclusion runs both ways, and the preview will not ignore it.",
  alternates: { canonical: "https://elfmatch.com/secret-santa-with-exclusions" },
  openGraph: {
    title: "Secret Santa with exclusions",
    description:
      "An exclusion keeps two people from being assigned to each other, in either direction.",
    url: "https://elfmatch.com/secret-santa-with-exclusions",
    images: [shareImage],
  },
};

export default function ExclusionsPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto max-w-page px-4 pb-16 pt-10 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-cranberry">
          Exclusions
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl text-evergreen sm:text-5xl">
          Keep couples out of the draw.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          An exclusion is a pair who must not be assigned to each other. It
          runs both ways. Use it for a couple, for siblings who already buy
          for each other, or for anyone else who should not draw.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The{" "}
          <Link href="/" className="text-evergreen underline decoration-rule underline-offset-4">
            Secret Santa generator
          </Link>{" "}
          keeps that pair out of both directions. You still see the full
          preview before anyone is emailed. The pair is not told they were
          excluded.
        </p>

        <div className="mt-12 divide-y divide-rule border-y border-rule">
          {[
            [
              "Before you send",
              "Add the pair from the exchange page. You can add as many as the group can still support. A draw needs at least three people who have joined.",
            ],
            [
              "What the preview does",
              "You see every pairing before anyone else does. The preview keeps every exclusion. Generate another set if one arrangement feels wrong. Confirming emails the names and fixes them.",
            ],
            [
              "When a draw is impossible",
              "If someone has nobody left they can give to, Elf Match says so and does not invent a pairing. Remove an exclusion, or wait for another person to join, then preview again.",
            ],
            [
              "Who finds out",
              "The exclusion is visible to the organizer. It is not announced to the pair. After the draw, each person still sees only their own recipient.",
            ],
            [
              "Couples and siblings",
              "Add one exclusion per pair, not one rule for the whole household. Two people who should not buy for each other are one pair. A third person in that household can still draw either of them, unless you add those pairs too.",
            ],
            [
              "Last year’s pairs",
              "An exclusion does not remember last year by itself. If the same people should not match again, add the pair before you confirm this year’s draw. Generating another preview will keep that pair out.",
            ],
            [
              "What an exclusion is not",
              "It does not hide someone from the group, and it does not remove them from the draw. They still give a gift and still receive one. The only change is that those two people will not be assigned to each other.",
            ],
          ].map(([title, body]) => (
            <article key={title} className="py-6">
              <h2 className="font-display text-2xl text-ink">{title}</h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{body}</p>
            </article>
          ))}
        </div>

        <section className="mt-12 max-w-2xl">
          <h2 className="font-display text-2xl text-ink">Before you add the first pair</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            A draw needs at least three people who have joined. Pending
            invitations are not in the draw. Add exclusions after those people
            have joined, and before you confirm. You can still generate
            another preview after adding a pair. You cannot change the names
            after the emails go out.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The organizer chooses the currency for the budget. A wishlist is readable by its author, and
            after the draw only by the assigned giver. An exclusion does not
            change either of those. It only keeps two people from being
            assigned to each other.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            If the group is a family and an office at once, use the same
            exchange. The exclusions are pairs, not a label for the group.
            Read the{" "}
            <Link href="/family-and-office" className="text-evergreen underline decoration-rule underline-offset-4">
              family or office
            </Link>{" "}
            page for who usually needs a pair, and{" "}
            <Link href="/how-it-works" className="text-evergreen underline decoration-rule underline-offset-4">
              how an exchange runs
            </Link>{" "}
            for the order of steps.
          </p>
        </section>
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
