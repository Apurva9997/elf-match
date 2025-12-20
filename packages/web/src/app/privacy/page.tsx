import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how GiftWhisper collects, uses, and protects your personal information when you use our Secret Santa gift exchange platform.",
  alternates: {
    canonical: "https://giftwhisper.online/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎁</span>
              <span className="font-display text-xl font-semibold text-cream">
                GiftWhisper
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <article className="max-w-3xl mx-auto prose prose-invert prose-gold">
          <h1 className="text-3xl font-display font-bold text-cream mb-8">
            Privacy Policy
          </h1>

          <p className="text-cream/70 mb-6">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
              1. Information We Collect
            </h2>
            <p className="text-cream/70 mb-4">
              When you use GiftWhisper, we collect the following information:
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
                preferences you choose to share with your group.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-cream/70 mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>Provide and operate the GiftWhisper service</li>
              <li>
                Send you important notifications about your gift exchanges
              </li>
              <li>Match participants in Secret Santa exchanges</li>
              <li>Share your delivery address with your assigned gift giver</li>
              <li>Improve and optimize our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
              3. Information Sharing
            </h2>
            <p className="text-cream/70 mb-4">
              We do not sell your personal information. We share your
              information only in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>
                <strong className="text-cream">Within your exchange:</strong>{" "}
                Your wishlist is visible to your group members. Your delivery
                address is shared only with your assigned Secret Santa.
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
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
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
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
              5. Data Retention
            </h2>
            <p className="text-cream/70">
              We retain your data for as long as your account is active or as
              needed to provide you services. You can request deletion of your
              account and associated data at any time by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
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
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
              7. Cookies and Analytics
            </h2>
            <p className="text-cream/70">
              We use cookies and similar technologies to provide functionality
              and analyze usage. We use Amplitude for analytics to understand
              how users interact with our service and improve the experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
              8. Contact Us
            </h2>
            <p className="text-cream/70">
              If you have questions about this Privacy Policy or your personal
              data, please contact us at{" "}
              <a
                href="mailto:hello@giftwhisper.online"
                className="text-gold hover:text-gold-light"
              >
                hello@giftwhisper.online
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-cream mb-4">
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

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gold/10">
        <div className="max-w-6xl mx-auto text-center">
          <Link href="/" className="text-cream/50 hover:text-cream text-sm">
            ← Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
