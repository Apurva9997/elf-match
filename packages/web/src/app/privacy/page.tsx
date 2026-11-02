import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { shareImage } from "@/lib/share";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Elf Match collects, uses, and protects personal information for a gift exchange.",
  alternates: {
    canonical: "https://elfmatch.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy",
    description:
      "How Elf Match collects, uses, and protects personal information for a gift exchange.",
    url: "https://elfmatch.com/privacy",
    images: [shareImage],
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="pb-16 px-4 sm:px-6 lg:px-8 pt-10">
        <article className="max-w-3xl mx-auto prose prose-invert prose-gold">
          <h1 className="text-3xl font-display text-evergreen mb-8">
            Privacy Policy
          </h1>

          <p className="text-cream/70 mb-6">
            Last updated: 30 October 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              1. Information We Collect
            </h2>
            <p className="text-cream/70 mb-4">
              When you use Elf Match, we collect the following information:
            </p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>
                <strong className="text-cream">Email address:</strong> Required
                for account creation and to send you notifications about your
                gift exchanges.
              </li>
              <li>
                <strong className="text-cream">Name:</strong> Optional, used to
                personalize your experience and help your Secret Santa identify
                you.
              </li>
              <li>
                <strong className="text-cream">Delivery address:</strong>{" "}
                Provided voluntarily for gift delivery purposes, shared only
                with your assigned Secret Santa.
              </li>
              <li>
                <strong className="text-cream">Wishlist items:</strong> Gift
                preferences. After the draw, only your assigned giver can read
                them. The title, the note, and the shop link are sealed before
                they are stored.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-cream/70 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>Provide and operate the Elf Match service</li>
              <li>
                Send you important notifications about your gift exchanges
              </li>
              <li>Match participants in Secret Santa exchanges</li>
              <li>Share your delivery address with your assigned gift giver</li>
              <li>Improve and optimize our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              3. Information Sharing
            </h2>
            <p className="text-cream/70 mb-4">
              We do not sell your personal information. We share your
              information only in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>
                <strong className="text-cream">Within your exchange:</strong>{" "}
                Your wishlist is visible to you, and after the draw to the
                person assigned to give you a gift. Your delivery address is
                shared only with that person. A person in another exchange
                cannot open yours, read your wishlist, or see your assignment.
              </li>
              <li>
                <strong className="text-cream">Service providers:</strong> We
                use trusted third-party services for email delivery and hosting.
              </li>
              <li>
                <strong className="text-cream">Legal requirements:</strong> We
                may disclose information if required by law.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              4. Data Security
            </h2>
            <p className="text-cream/70">
              Sign-in and pages are served over HTTPS. A delivery address is
              encrypted before it is stored. A wishlist title, note, and shop
              link are sealed before they are stored. The seal uses a key that
              is not in the database. A copy of the database, including the
              application&apos;s salt and encryption secret, does not contain
              the words. The application opens a list only while serving the
              person who wrote it, or their assigned giver after the draw.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              5. Data Retention
            </h2>
            <p className="text-cream/70">
              We keep an exchange while it is in use. You do not have to ask us
              to remove it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              6. Your Rights
            </h2>
            <p className="text-cream/70 mb-4">
              You can do this yourself. You do not need to email us first.
            </p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>Read and correct the name, email, and address on your profile.</li>
              <li>
                <strong className="text-cream">Delete an exchange.</strong> The
                organizer opens the exchange and deletes it. That removes the
                group, the seats, the wishlists, the exclusions, and a saved
                draw. Nothing from that exchange is kept.
              </li>
              <li>
                <strong className="text-cream">Delete the account.</strong> From
                your profile, confirm account deletion. That removes the sign-in
                and every Elf Match row for it, including an exchange you
                organize. A seat you held in someone else&apos;s exchange is
                removed too, and so is any pairing that used that seat.
              </li>
              <li>
                Stop using the product. We do not send marketing mail. Exchange
                mail is the invitation, the reminder, and the assignment.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              7. Cookies and Analytics
            </h2>
            <p className="text-cream/70">
              We use cookies and similar technologies to provide functionality
              and analyze usage. We use Amplitude to understand how people
              move through the product. We also use Ahrefs Web Analytics,
              which is cookie-free, to count visits and see which pages are
              used. Neither is used to sell personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              8. Contact Us
            </h2>
            <p className="text-cream/70">
              If you have questions about this Privacy Policy or your personal
              data, please contact us at{" "}
              <a
                href="mailto:hello@elfmatch.com"
                className="text-gold hover:text-gold-light"
              >
                hello@elfmatch.com
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-cream/70">
              We may update this Privacy Policy from time to time. We will
              notify you of any significant changes by posting the new policy on
              this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
