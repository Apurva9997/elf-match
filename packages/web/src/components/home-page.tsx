"use client";

import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const examplePeople = [
  { name: "Priya N.", note: "Joined · wishlist started", state: "in" },
  { name: "Arun M.", note: "Joined · wishlist empty", state: "in" },
  { name: "Leela K.", note: "Invitation still open", state: "wait" },
  { name: "Dev S.", note: "Joined · three wishes", state: "in" },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const startHref = isAuthenticated ? "/dashboard" : "/auth/login";
  const startLabel = isAuthenticated ? "Open your exchanges" : "Create an exchange";

  return (
    <div className="min-h-screen">
      <PublicNav />

      <main>
        <section className="mx-auto grid max-w-page items-start gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16 lg:pt-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cranberry">
              For the person organizing
            </p>
            <h1 className="mt-4 max-w-[16ch] font-display text-[2.6rem] font-medium leading-[1.05] text-evergreen sm:text-6xl">
              Draw names without a hat on the table.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Elf Match is where you set the budget and the date, invite people
              by email, keep certain pairs apart, and send each person only
              their own match.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={startHref}
                className="inline-flex items-center justify-center bg-cranberry px-5 py-3 text-base font-semibold text-ivory hover:bg-cranberry-deep"
              >
                {startLabel}
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center border border-evergreen/25 px-5 py-3 text-base font-semibold text-evergreen hover:bg-evergreen-soft"
                >
                  Sign in to an existing exchange
                </Link>
              )}
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-faint">
              Next: name the exchange, choose a budget and a date, then add
              email addresses. People join from the invitation, write a
              wishlist, and wait for you to draw.
            </p>
          </div>

          <figure className="relative">
            <figcaption className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Example invitation — not a live exchange
            </figcaption>
            <div className="paper-grain relative border border-rule bg-ivory-card p-5 shadow-paper sm:p-6">
              <div
                aria-hidden
                className="absolute -left-3 top-8 hidden h-16 w-6 bg-cranberry sm:block"
                style={{ clipPath: "polygon(0 8%, 100% 0, 100% 100%, 0 92%)" }}
              />
              <div className="flex items-start justify-between gap-4 border-b border-dashed border-rule pb-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                    Gift tag
                  </p>
                  <p className="mt-1 font-display text-2xl text-evergreen">
                    Cousins, December
                  </p>
                </div>
                <p className="border border-evergreen/20 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-evergreen">
                  Collecting wishes
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">Budget</dt>
                  <dd className="mt-0.5 font-medium text-ink">₹500 – ₹1,000</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">Exchange</dt>
                  <dd className="mt-0.5 font-medium text-ink">21 December</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">Wishlists due</dt>
                  <dd className="mt-0.5 font-medium text-ink">12 December</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">People</dt>
                  <dd className="mt-0.5 font-medium text-ink">3 joined · 1 waiting</dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-rule pt-4">
                <p className="text-xs uppercase tracking-wider text-ink-faint">Who has joined</p>
                <ul className="mt-2 divide-y divide-rule">
                  {examplePeople.map((person) => (
                    <li key={person.name} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="shrink-0 font-medium text-ink">{person.name}</span>
                      <span
                        className={
                          person.state === "wait"
                            ? "text-right text-sm text-cranberry"
                            : "text-right text-sm text-ink-soft"
                        }
                      >
                        {person.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 bg-evergreen-soft/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-evergreen">
                  A wishlist detail, visible to the group
                </p>
                <p className="mt-1 font-display text-lg text-ink">
                  Dev asked for a linen tea towel set
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  About ₹650 · link saved · no one here is told who will buy it.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Names, prices, and dates on this card are sample copy so you can
              see the shape of an exchange. Assignments are not shown, because
              they are not public.
            </p>
          </figure>
        </section>

        <section className="border-y border-rule bg-ivory-card/70">
          <div className="mx-auto max-w-page px-4 py-14 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl text-evergreen sm:text-4xl">
                What you are actually creating
              </h2>
              <p className="mt-3 text-lg text-ink-soft">
                An exchange is a named group with a spend range, two dates, a
                list of people, and — when you decide — a private draw.
              </p>
            </div>

            <ol className="mt-10 border-t border-rule">
              {[
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
                  body: "You need at least three people. Pending invitations are not in the draw. You can preview the matches, generate another set, then confirm. After emails go out, the draw is fixed.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="grid gap-2 border-b border-rule py-6 sm:grid-cols-[4.5rem_14rem_1fr] sm:gap-6 sm:py-7"
                >
                  <span className="font-mono text-sm text-cranberry">{step.n}</span>
                  <h3 className="font-display text-2xl text-ink">{step.title}</h3>
                  <p className="text-ink-soft leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-page gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Who can see what
            </p>
            <h2 className="mt-3 font-display text-3xl text-evergreen sm:text-4xl">
              Wishlists are shared. Assignments are not.
            </h2>
            <p className="mt-4 text-ink-soft leading-relaxed">
              A wishlist is how the group helps the giver. A match is how the
              surprise stays intact. Elf Match keeps those two kinds of
              information apart.
            </p>
            <dl className="mt-8 divide-y divide-rule border-y border-rule">
              {[
                ["Wishlist items", "Anyone in the exchange can read titles, notes, price estimates, and shop links."],
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
          </div>

          <div className="relative mb-6 lg:mt-8">
            <div
              aria-hidden
              className="absolute -right-2 top-3 hidden h-[calc(100%-1.5rem)] w-full border border-rule bg-ivory-deep sm:block"
            />
            <article className="paper-grain relative border border-ink/15 bg-[#fffdf8] p-5 shadow-tag sm:p-7">
              <div className="flex items-center justify-between border-b border-rule pb-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                  Folded note · example
                </p>
                <p className="text-xs text-ink-faint">For the giver only</p>
              </div>
              <h3 className="mt-4 font-display text-[1.7rem] leading-tight text-evergreen">
                You are buying for Meera.
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                This is the kind of note a participant opens after you confirm
                the draw. It is not emailed to the rest of the group.
              </p>
              <div className="mt-5 space-y-3 border-t border-dashed border-rule pt-4 text-sm">
                <p>
                  <span className="text-ink-faint">Their list · </span>
                  A hardcover notebook, a small brass bell, seeds for a window box.
                </p>
                <p>
                  <span className="text-ink-faint">Address · </span>
                  Shown here to the assigned giver, not on the group page.
                </p>
                <p>
                  <span className="text-ink-faint">Spend · </span>
                  Stay inside ₹500 – ₹1,000.
                </p>
              </div>
              <p className="mt-5 text-xs text-ink-faint">
                Sample names. Nothing on this note is a real assignment.
              </p>
            </article>
          </div>
        </section>

        <section className="border-t border-rule bg-evergreen text-ivory">
          <div className="mx-auto grid max-w-page gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_0.7fr] md:items-end">
            <div>
              <h2 className="max-w-xl font-display text-3xl leading-tight sm:text-4xl">
                When everyone has joined, you draw the names.
              </h2>
              <p className="mt-4 max-w-xl text-ivory/80 leading-relaxed">
                Preview the pairings first. If a match feels wrong, generate
                another set — exclusions still apply. Confirm only when you
                mean to send the emails. After that, the assignments cannot be
                changed.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-start">
              <Link
                href={startHref}
                className="inline-flex items-center justify-center bg-ivory px-5 py-3 font-semibold text-evergreen hover:bg-ivory-card"
              >
                {startLabel}
              </Link>
              <Link href="/how-it-works" className="text-sm text-ivory/80 underline-offset-4 hover:underline">
                Read the sequence in more detail
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
