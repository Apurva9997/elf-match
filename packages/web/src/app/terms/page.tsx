import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using Elf Match, a free organizer for Secret Santa and other gift exchanges.",
  alternates: {
    canonical: "https://elfmatch.com/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <article className="max-w-3xl mx-auto prose prose-invert prose-gold">
          <h1 className="mb-8 font-display text-3xl text-evergreen">
            Terms of Service
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
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-cream/70">
              By accessing or using Elf Match (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service. If you do not agree
              to these terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              2. Description of Service
            </h2>
            <p className="text-cream/70">
              Elf Match is a free online platform that helps users organize
              Secret Santa and gift exchange events. The Service allows users to
              create exchanges, invite participants, create wishlists, set
              exclusion rules, and automatically match participants.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              3. User Accounts
            </h2>
            <p className="text-cream/70 mb-4">
              To use certain features of the Service, you must create an
              account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>
                Accept responsibility for all activities under your account
              </li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              4. Acceptable Use
            </h2>
            <p className="text-cream/70 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-cream/70 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post inappropriate, offensive, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>
                Use automated systems to access the Service without permission
              </li>
              <li>Interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              5. User Content
            </h2>
            <p className="text-cream/70">
              You retain ownership of content you post to the Service
              (wishlists, names, etc.). By posting content, you grant us a
              license to use, display, and distribute that content as necessary
              to provide the Service. You are solely responsible for the content
              you post.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              6. Privacy
            </h2>
            <p className="text-cream/70">
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-gold hover:text-gold-light">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your
              information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              7. Service Availability
            </h2>
            <p className="text-cream/70">
              We strive to keep the Service available at all times, but we do
              not guarantee uninterrupted access. We may modify, suspend, or
              discontinue the Service at any time without notice. We are not
              liable for any modification, suspension, or discontinuance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-cream/70">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF
              ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE
              WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED. YOUR USE OF THE
              SERVICE IS AT YOUR OWN RISK.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-cream/70">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, GIFTWHISPER SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING
              BUT NOT LIMITED TO FAILED GIFT EXCHANGES OR DISAPPOINTMENT WITH
              GIFTS RECEIVED.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              10. Termination
            </h2>
            <p className="text-cream/70">
              We may terminate or suspend your access to the Service at any
              time, with or without cause, with or without notice. Upon
              termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              11. Changes to Terms
            </h2>
            <p className="text-cream/70">
              We may modify these Terms at any time. We will notify users of
              significant changes by posting a notice on the Service. Your
              continued use of the Service after changes constitutes acceptance
              of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">
              12. Contact
            </h2>
            <p className="text-cream/70">
              For questions about these Terms, please contact us at{" "}
              <a
                href="mailto:hello@elfmatch.com"
                className="text-gold hover:text-gold-light"
              >
                hello@elfmatch.com
              </a>
              .
            </p>
          </section>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
