import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { shareImage } from "@/lib/share";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Office Secret Santa and family gift exchange",
  description:
    "One free exchange for an office that is not in one room, or a family that must keep couples apart. Invite by link. The draw stays private.",
  alternates: { canonical: "https://elfmatch.com/family-and-office" },
  openGraph: {
    title: "Secret Santa for a family or an office",
    description:
      "Keep couples apart, invite people who are not in the room, and send each person only their own match.",
    url: "https://elfmatch.com/family-and-office",
    images: [shareImage],
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
          Elf Match is the same tool for a family gift exchange and an office
          Secret Santa. The difference is who must not match, and who is not
          in the room when the names are drawn.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Use the{" "}
          <Link href="/" className="text-evergreen underline decoration-rule underline-offset-4">
            Secret Santa generator
          </Link>{" "}
          when the group cannot pass a hat. You set the budget and the date,
          invite people by one link or by email, and send each person only
          their own assignment.
        </p>

        <div className="mt-12 grid gap-10 border-t border-rule pt-10 md:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl text-ink">A family</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Add an exclusion for each couple, or for siblings who already buy
              for each other. The rule runs both ways. You can preview the
              pairings and generate another set before anyone is emailed.
            </p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              A cousin in another city joins the same exchange. They do not
              need to be on the call when you draw. After you confirm, they
              get an email that names only their recipient. The rest of the
              family never sees that pairing, and they never see the delivery
              address.
            </p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Last year&apos;s pairs can be excluded too. Add them before you
              confirm. If the rules leave someone with nobody they can give
              to, the preview says so and does not invent a match.
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
            <p className="mt-3 leading-relaxed text-ink-soft">
              The organizer can preview every pairing and generate another
              set before the emails go out. Confirming sends the names and
              fixes them. There is no redraw after that, so wait until the
              people who are actually participating have joined. A draw needs
              at least three.
            </p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              A manager does not have to be in the draw. Leave them off the
              invite, or invite them and add exclusions for anyone they
              should not buy for. The exclusion is visible to the organizer.
              It is not announced to the pair.
            </p>
          </section>
        </div>

        <section className="mt-12 max-w-2xl">
          <h2 className="font-display text-2xl text-ink">What both groups share</h2>
          <div className="mt-4 divide-y divide-rule border-y border-rule">
            {[
              [
                "One invite link",
                "The address stays the same until you expire it. Anyone who opens it and signs in joins as themselves. You can still email invitations one by one if that is how the group already talks.",
              ],
              [
                "A budget in your currency",
                "Choose the currency, then set a minimum and a maximum, or leave both blank. Everyone who joins can see the range. There is no paid tier.",
              ],
              [
                "A wishlist only the giver reads",
                "Each person can add a title, a note, a price, and a shop link. After the draw, only the assigned giver can open that list and the delivery address. The rest of the exchange cannot.",
              ],
              [
                "A draw you can preview",
                "At least three people have to have joined. You see every pairing, and you can generate another set. Confirming emails each person only their own recipient. After that, the names cannot be changed.",
              ],
              [
                "Anyone, in any country",
                "The invite link does not care which country someone is in. They sign in with an email code or with Google, join the same exchange, and see the budget in the currency you chose.",
              ],
            ].map(([title, body]) => (
              <article key={title} className="py-5">
                <h3 className="font-display text-xl text-ink">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{body}</p>
              </article>
            ))}
          </div>
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
