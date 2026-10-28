import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Elf Match collects, uses, and protects personal information for a gift exchange.",
  alternates: {
    canonical: "https://elfmatch.com/privacy",
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
            Last updated: 27 October 2026
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
                preferences. After the draw, only your assigned giver can read them.
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
                shared only with that person.
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
              We implement industry-standard security measures to protect your
              data, including encryption in transit (HTTPS) and at rest.
              Delivery addresses are encrypted before storage to provide
              additional protection.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              5. Data Retention
            </h2>
            <p className="text-cream/70">
              We retain your data for as long as your account is active or as
              needed to provide you services. From your profile, you can delete
              the account. That removes the sign-in account, your name, email,
              phone, and delivery address. An exchange you organize has to be
              archived first. A saved draw keeps the pair, with your name
              replaced by Former member, so the other person's gift is not lost.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              6. Your Rights
            </h2>
            <p className="text-cream/70 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of non-essential communications</li>
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
