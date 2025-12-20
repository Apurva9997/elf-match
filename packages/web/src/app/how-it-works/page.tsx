import { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";

export const metadata: Metadata = {
  title: "How It Works - Set Up Secret Santa in 3 Easy Steps",
  description:
    "Learn how to organize your Secret Santa gift exchange with GiftWhisper. Create an exchange, invite participants, and let us handle the matching. It takes just 2 minutes!",
  alternates: {
    canonical: "https://giftwhisper.online/how-it-works",
  },
  openGraph: {
    title: "How GiftWhisper Works - Secret Santa Made Simple",
    description:
      "Create, invite, match. Three simple steps to organize your perfect gift exchange.",
  },
};

const steps = [
  {
    number: "01",
    title: "Create Your Exchange",
    description:
      "Start by giving your exchange a name - 'Office Secret Santa 2024' or 'Family Gift Exchange'. Then set your budget range and pick the exchange date. The whole process takes about 30 seconds.",
    details: [
      "Choose a memorable name for your exchange",
      "Set minimum and maximum budget (optional but recommended)",
      "Pick a wishlist deadline to remind people",
      "Set the gift exchange date",
    ],
    emoji: "✨",
  },
  {
    number: "02",
    title: "Invite Your Participants",
    description:
      "Add the email addresses of everyone you want to include. They'll receive a beautiful invitation email with a link to join. They can create their account, add their wishlist, and enter their delivery address.",
    details: [
      "Enter emails one by one or paste a list",
      "Participants get automatic invitation emails",
      "Track who has accepted and who's still pending",
      "Resend invitations with one click if needed",
    ],
    emoji: "💌",
  },
  {
    number: "03",
    title: "Set Up Exclusions (Optional)",
    description:
      "Want to make sure couples don't get each other? Or prevent certain pairs from matching? Add exclusion rules. Our algorithm will respect these when making assignments.",
    details: [
      "Prevent couples from being matched",
      "Exclude family members from gifting each other",
      "Rules work both ways automatically",
      "Add as many exclusions as you need",
    ],
    emoji: "🛡️",
  },
  {
    number: "04",
    title: "Generate & Send Assignments",
    description:
      "When everyone has joined and added their wishlists, click 'Assign Santas'. Preview the random assignments, reshuffle if needed, then confirm. Everyone gets a private email revealing who they're gifting.",
    details: [
      "Preview all assignments before sending",
      "Regenerate as many times as you want",
      "Assignments respect all exclusion rules",
      "Each person gets a private email with their match",
    ],
    emoji: "🎁",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <PublicNav />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-cream mb-6">
              Organize Secret Santa in{" "}
              <span className="text-gradient-gold">4 Simple Steps</span>
            </h1>
            <p className="text-xl text-cream/70 max-w-2xl mx-auto">
              From setup to gift exchange - here&apos;s exactly how GiftWhisper
              makes organizing your Secret Santa effortless.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12 mb-16">
            {steps.map((step, index) => (
              <div key={step.number} className="glass-card p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0 text-center md:text-left">
                    <span className="text-5xl block mb-2">{step.emoji}</span>
                    <span className="text-gold font-mono text-sm">
                      Step {step.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-display font-bold text-cream mb-3">
                      {step.title}
                    </h2>
                    <p className="text-cream/70 mb-4">{step.description}</p>
                    <ul className="space-y-2">
                      {step.details.map((detail, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-cream/60 text-sm"
                        >
                          <span className="text-gold mt-1">✓</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute left-1/2 -bottom-6 w-px h-12 bg-gradient-to-b from-gold/30 to-transparent" />
                )}
              </div>
            ))}
          </div>

          {/* After Assignment Section */}
          <div className="glass-card p-8 mb-16">
            <h2 className="text-2xl font-display font-bold text-cream mb-6 text-center">
              What Happens After Assignments?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <span className="text-3xl block mb-3">📋</span>
                <h3 className="font-semibold text-cream mb-2">
                  View Your Match
                </h3>
                <p className="text-cream/60 text-sm">
                  See who you&apos;re gifting, their wishlist, and delivery
                  address all in one place.
                </p>
              </div>
              <div className="text-center">
                <span className="text-3xl block mb-3">🛒</span>
                <h3 className="font-semibold text-cream mb-2">Shop & Track</h3>
                <p className="text-cream/60 text-sm">
                  Mark your gift as bought, shipped, or delivered to stay
                  organized.
                </p>
              </div>
              <div className="text-center">
                <span className="text-3xl block mb-3">🎉</span>
                <h3 className="font-semibold text-cream mb-2">Spread Joy</h3>
                <p className="text-cream/60 text-sm">
                  Watch the gift exchange come together and make someone&apos;s
                  day special.
                </p>
              </div>
            </div>
          </div>

          {/* Time Estimate */}
          <div className="text-center mb-16">
            <div className="inline-block glass-card px-8 py-4">
              <span className="text-5xl font-bold text-gold">2</span>
              <span className="text-2xl text-cream/70 ml-2">minutes</span>
              <p className="text-cream/50 text-sm mt-2">
                Average time to set up an exchange
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center glass-card p-8">
            <h2 className="text-2xl font-display font-bold text-cream mb-4">
              Ready to Start Your Exchange?
            </h2>
            <p className="text-cream/70 mb-6 max-w-xl mx-auto">
              Join others who&apos;ve made their gift exchanges stress-free with
              GiftWhisper.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/login"
                className="inline-block px-8 py-3 bg-gradient-gold text-midnight font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Create Free Exchange →
              </Link>
              <Link
                href="/features"
                className="inline-block px-8 py-3 border border-gold/30 text-cream rounded-lg hover:bg-gold/10 transition-colors"
              >
                See All Features
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gold/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-cream/50 hover:text-cream text-sm">
            ← Back to Home
          </Link>
          <div className="flex gap-6 text-sm">
            <Link
              href="/faq"
              className="text-cream/50 hover:text-cream transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/privacy"
              className="text-cream/50 hover:text-cream transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-cream/50 hover:text-cream transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

