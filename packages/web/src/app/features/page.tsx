import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { shareImage } from "@/lib/share";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Secret Santa budget, exclusions, wishlists",
  description:
    "Budget, dates, a shareable invite link, email invitations, wishlists with links, exclusions, a previewable draw, encrypted addresses, and gift status for the giver.",
  alternates: {
    canonical: "https://elfmatch.com/features",
  },
  openGraph: {
    title: "What you can set in an Elf Match exchange",
    description:
      "The fields and rules an organizer actually uses: budget, invites, exclusions, wishlists, and a private draw.",
    images: [shareImage],
  },
};

const settings = [
  {
    label: "Exchange",
    title: "Name, budget, and two dates",
    body: "A name, an optional spend range in the currency you choose, a wishlist deadline, and the exchange date. Participants see the same details you enter, so the invitation and the group page agree. Leave the amounts blank if the group has no range.",
  },
  {
    label: "People",
    title: "A shared link, or email invitations",
    body: "Generate one invite link for the group, or invite addresses one by one. The People page keeps the address so you can copy it again, and offers a message to paste with it. You need at least three joined people before a draw is possible. The shared address stays the same until you expire it. Turning signing off stops new people joining without retiring that address. Pending email invitations stay visible, and you can resend them.",
  },
  {
    label: "Wishlists",
    title: "Title, note, price, and a shop link",
    body: "Each person can add items with a description, a price estimate, and a link. After the draw, only the assigned giver can read that list.",
  },
  {
    label: "Exclusions",
    title: "Pairs who must not match",
    body: "One exclusion keeps two people from being assigned to each other, in either direction. The draw will not ignore a rule you saved.",
  },
  {
    label: "The draw",
    title: "Preview, regenerate, then confirm",
    body: "You see every pairing before anyone else does. Generate another arrangement as many times as you like. Confirming sends each person a private email. After that, assignments are fixed.",
  },
  {
    label: "Addresses",
    title: "Shared only with the assigned giver",
    body: "A delivery address is encrypted before it is stored. Other participants do not see it. The person buying the gift does.",
  },
  {
    label: "Sign-in",
    title: "A code by email, or Google",
    body: "People join with a free account. Email sign-in uses a one-time code, so there is no password to invent for a once-a-year exchange. Apple sign-in appears only when it is switched on for this site.",
  },
  {
    label: "After the draw",
    title: "Gift status for the giver",
    body: "The person buying can mark the gift bought, shipped, or delivered. Those notes stay with them. The recipient is not shown the status.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto max-w-page px-4 pb-16 pt-10 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
          The desk
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl text-evergreen sm:text-5xl">
          What you can set before anyone buys a gift.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Elf Match is free to use: no paid tier and no card to start. These
          are the controls on an exchange, not a catalogue of moods. Start
          from the{" "}
          <Link href="/" className="text-evergreen underline decoration-rule underline-offset-4">
            Secret Santa generator
          </Link>
          .
        </p>

        <div className="mt-12 divide-y divide-rule border-y border-rule">
          {settings.map((item) => (
            <article key={item.title} className="grid gap-2 py-6 sm:grid-cols-[8rem_1fr] sm:gap-8 sm:py-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                {item.label}
              </p>
              <div>
                <h2 className="font-display text-2xl text-ink">{item.title}</h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-14 max-w-2xl">
          <h2 className="font-display text-2xl text-ink">What a participant sees</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            They open the invite, sign in, and join as themselves. They can
            write a wishlist with a note, a shop link, and a price in the
            currency of the exchange. They can add a delivery address. After
            the draw they see one name: the person they are buying for. They
            do not see the rest of the pairings, and they do not see anyone
            else&apos;s address.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The organizer sees more, and only until the emails go out. The
            preview lists every pairing. Generating another set keeps every
            exclusion. Confirming sends the names and fixes them. A draw needs
            at least three people who have joined. Someone with an open
            invitation is not in the draw.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The same exchange works for a family and an office. Read{" "}
            <Link href="/family-and-office" className="text-evergreen underline decoration-rule underline-offset-4">
              family or office
            </Link>{" "}
            for who is usually not in the room, and{" "}
            <Link href="/secret-santa-with-exclusions" className="text-evergreen underline decoration-rule underline-offset-4">
              exclusions
            </Link>{" "}
            for a pair who must not match.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl text-evergreen">Against the usual alternatives</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            A comparison of chores, not of brands. Paper slips and a spreadsheet can both draw names. They do not keep a wishlist next to a private assignment.
          </p>
          <div className="mt-6 overflow-x-auto border border-rule">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-ivory-deep/80 text-ink">
                <tr>
                  <th className="px-4 py-3 font-semibold"> </th>
                  <th className="px-4 py-3 font-semibold">Elf Match</th>
                  <th className="px-4 py-3 font-medium text-ink-soft">A spreadsheet</th>
                  <th className="px-4 py-3 font-medium text-ink-soft">Paper slips</th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                {[
                  ["Draw that respects exclusions", "Built in", "You maintain the rules", "Hard to enforce"],
                  ["Wishlist beside the match", "Shown to the assigned giver", "Usually a second document", "No"],
                  ["Who sees the full draw", "Organizer, until send", "Whoever has the file", "Whoever unfolds the slips"],
                  ["Address only for the giver", "Yes", "Easy to overshare", "Passed by hand"],
                  ["People in different cities", "Email invitation", "Possible", "Needs everyone present"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-rule">
                    {row.map((cell, i) => (
                      <td key={cell} className={`px-4 py-3 ${i === 0 ? "font-medium text-ink" : ""}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-12">
          <Link
            href="/auth/login?intent=create"
            className="inline-flex bg-cranberry px-5 py-3 font-semibold text-ivory hover:bg-cranberry-deep"
          >
            Create an exchange
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
