import { HeroFilm } from "@/components/hero-film";
import { HomeActions } from "@/components/home-actions";
import { SampleExchange } from "@/components/sample-exchange";
import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import Link from "next/link";

const steps = [
  {
    n: "01",
    title: "Name it, price it, date it",
    body: "You enter a name, an optional minimum and maximum budget, a wishlist deadline, and the day gifts change hands. Everyone in the exchange can see those details.",
  },
  {
    n: "02",
    title: "Invite by email",
    body: "You add addresses. Each person gets an invitation link, creates a free account with a sign-in code, and shows up as pending until they join. You can resend an invitation that is still open.",
  },
  {
    n: "03",
    title: "Keep particular pairs apart",
    body: "Before the draw, you can exclude two people from matching. The rule runs both ways: neither is assigned the other. Couples and close relatives are the usual reason.",
  },
  {
    n: "04",
    title: "Draw when the list is ready",
    body: "You need at least three people who have joined. Pending invitations are left out. You can preview the matches, generate another set, then confirm. After emails go out, the draw is fixed.",
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <main>
        <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-evergreen">
          <HeroFilm />
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-ivory via-ivory/90 to-transparent lg:hidden" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-ivory from-10% via-ivory/80 via-[38%] to-transparent to-[64%] lg:block" />
          <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-page items-end px-4 pb-16 pt-12 sm:px-6 lg:items-center lg:py-12">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-cranberry">
                Free Secret Santa for family or office
              </p>
              <h1 className="mt-4 max-w-[16ch] font-display text-[2.5rem] font-medium leading-[1.05] text-evergreen sm:text-6xl sm:leading-[1.02]">
                Draw the names. Keep the giving secret.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                Set a rupee budget and dates, invite by email, exclude pairs, and
                preview every match before sending the final draw.
              </p>
              <HomeActions />
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
                Free. Sign in, then name your exchange.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-rule bg-ivory-card/70">
          <div className="mx-auto max-w-page px-4 py-14 sm:px-6">
            <h2 className="font-display text-3xl text-evergreen sm:text-4xl">
              How an exchange runs
            </h2>
            <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-14">
              <ol className="border-t border-rule">
                {steps.map((step) => (
                  <li key={step.n} className="border-b border-rule py-5">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-sm text-cranberry">{step.n}</span>
                      <h3 className="font-display text-2xl text-ink">{step.title}</h3>
                    </div>
                    <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">{step.body}</p>
                  </li>
                ))}
              </ol>
              <div className="lg:sticky lg:top-24">
                <SampleExchange />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-page px-4 py-16 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
            Who can see what
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl text-evergreen sm:text-4xl">
            A wishlist is for the giver. The draw is not for the group.
          </h2>
          <p className="mt-4 max-w-2xl text-ink-soft">
            You write what you would like. After the names are sent, only the
            person buying for you can read it.
          </p>
          <dl className="mt-8 max-w-3xl divide-y divide-rule border-y border-rule">
            {[
              ["Wishlist items", "You write a title, a note, a price estimate, and a shop link. After the draw, only your assigned giver can read them."],
              ["Delivery address", "Encrypted in storage. Shown only to the person assigned to give that gift."],
              ["The draw", "You, as organizer, can preview every pairing before you send it. After that, each person sees only their own recipient."],
              ["Gift progress", "The giver can mark a gift bought, shipped, or delivered for their own notes. The recipient does not see those updates."],
            ].map(([term, detail]) => (
              <div key={term} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <dt className="font-semibold text-ink">{term}</dt>
                <dd className="text-ink-soft">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-rule bg-evergreen text-ivory">
          <div className="mx-auto grid max-w-page gap-6 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_0.7fr] md:items-end">
            <div>
              <h2 className="max-w-xl font-display text-3xl leading-tight text-ivory sm:text-4xl">
                When you confirm, the names are sent. They cannot be redrawn.
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-ivory/80">
                Preview the pairings first. Generate another set if one feels
                wrong. Confirm only when you mean to send the emails.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="/how-it-works" className="text-ivory underline-offset-4 hover:underline">
                How a Secret Santa exchange runs
              </Link>
              <Link href="/auth/login?intent=join" className="text-ivory/80 underline-offset-4 hover:underline">
                Were you invited? Open the link in the email, or sign in with that address.
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
