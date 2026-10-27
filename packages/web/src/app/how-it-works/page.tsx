import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to organize a Secret Santa exchange",
  description:
    "Name the exchange, set a budget and dates, invite people by email, add exclusions, then preview and send private assignments.",
  alternates: {
    canonical: "https://elfmatch.com/how-it-works",
  },
  openGraph: {
    title: "How an Elf Match exchange runs",
    description:
      "From the invitation to the private draw: what the organizer does, and what each person sees.",
  },
};

const steps = [
  {
    number: "01",
    title: "Create the exchange",
    body: "Give it a name people will recognize in the invitation. Add a minimum and maximum budget if you want everyone spending in the same range. Set a wishlist deadline and the day gifts are exchanged. Those fields are visible to everyone who joins.",
    details: [
      "Name is required",
      "Budget, wishlist deadline, and exchange date are optional",
      "You can edit the details later. After the draw, tell the group yourself — they are not emailed the change",
    ],
  },
  {
    number: "02",
    title: "Invite people by email",
    body: "Enter the addresses of the people who should be in the draw. Each one receives an invitation link. They create a free account — a sign-in code by email, or Google if they prefer — then join, write a wishlist, and can add a delivery address.",
    details: [
      "Open invitations stay marked as pending",
      "You can resend an invitation that has not been accepted",
      "Pending people are not included when you draw names",
    ],
  },
  {
    number: "03",
    title: "Add exclusions if you need them",
    body: "An exclusion is a pair who must not be assigned to each other. It applies in both directions. Use it for couples, siblings, or anyone else who already buys for each other. You can add as many pairs as the group can still support.",
    details: [
      "Set before you confirm the draw",
      "The preview respects every exclusion",
      "If the rules make a draw impossible, you will need to loosen them",
    ],
  },
  {
    number: "04",
    title: "Preview, then send the draw",
    body: "When at least three people have joined, you can assign Santas. Look at the full preview first — only you see every pairing. Generate another set if you want a different arrangement. Confirm when you are ready to email each person their own recipient. After those emails go out, the assignments cannot be changed.",
    details: [
      "No one is assigned themselves",
      "Each participant receives only their own match",
      "The recipient’s wishlist and delivery address open for that giver",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto max-w-page px-4 pb-16 pt-10 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
          Sequence
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl text-evergreen sm:text-5xl">
          How an exchange goes from a name to a private draw.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Four things you do as the organizer. Nothing here is automatic until
          you confirm the assignments.
        </p>

        <ol className="mt-12 border-t border-rule">
          {steps.map((step) => (
            <li key={step.number} className="grid gap-4 border-b border-rule py-8 lg:grid-cols-[5rem_1fr_16rem] lg:gap-8">
              <span className="font-mono text-sm text-cranberry">{step.number}</span>
              <div>
                <h2 className="font-display text-2xl text-ink">{step.title}</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{step.body}</p>
              </div>
              <ul className="space-y-2 border-l border-rule pl-4 text-sm text-ink-soft">
                {step.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section className="mt-14 grid gap-8 border border-rule bg-ivory-card p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl text-evergreen">After the emails go out</h2>
            <p className="mt-3 text-ink-soft leading-relaxed">
              The giver opens their assignment, reads the wishlist, and — if one
              was saved — the delivery address. They can mark the gift bought,
              shipped, or delivered for themselves. The person receiving the
              gift does not see that progress.
            </p>
          </div>
          <div className="border border-dashed border-rule bg-ivory p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Envelope · what the email carries
            </p>
            <p className="mt-3 font-display text-xl text-ink">
              “You are buying for one person in Cousins, December.”
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              The message names their recipient and links them into the
              exchange. It does not list the rest of the draw.
            </p>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center bg-cranberry px-5 py-3 font-semibold text-ivory hover:bg-cranberry-deep"
          >
            Create an exchange
          </Link>
          <Link
            href="/faq"
            className="inline-flex items-center justify-center border border-evergreen/25 px-5 py-3 font-semibold text-evergreen hover:bg-evergreen-soft"
          >
            Common questions
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
