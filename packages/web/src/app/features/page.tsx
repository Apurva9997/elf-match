import { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Gift,
  Shield,
  Sparkles,
  Mail,
  MapPin,
  Lock,
  Zap,
  RefreshCw,
  Bell,
  Heart,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features - Everything You Need for Secret Santa",
  description:
    "Discover all the features that make GiftWhisper the best free Secret Santa organizer. Wishlists, exclusion rules, automatic matching, email notifications, and more.",
  alternates: {
    canonical: "https://giftwhisper.online/features",
  },
  openGraph: {
    title: "GiftWhisper Features - The Complete Secret Santa Solution",
    description:
      "Wishlists, exclusion rules, automatic matching, secure address sharing, and more. Everything you need for the perfect gift exchange.",
  },
};

const features = [
  {
    icon: Users,
    title: "Unlimited Participants",
    description:
      "Invite as many people as you want to your exchange. Whether it's a small family gathering of 4 or a large office party of 100+, GiftWhisper handles it all.",
    highlight: "No participant limits",
  },
  {
    icon: Gift,
    title: "Rich Wishlists",
    description:
      "Create detailed wishlists with titles, descriptions, price estimates, and direct links to products. Help your Secret Santa find the perfect gift.",
    highlight: "Add links & prices",
  },
  {
    icon: Shield,
    title: "Exclusion Rules",
    description:
      "Prevent certain pairs from being matched - perfect for couples, family members, or anyone who shouldn't gift each other. Set bidirectional exclusions with one click.",
    highlight: "Couples-friendly",
  },
  {
    icon: Sparkles,
    title: "Smart Matching Algorithm",
    description:
      "Our algorithm ensures fair, truly random assignments while respecting all your exclusion rules. Preview assignments before sending to make sure everyone's happy.",
    highlight: "Preview before sending",
  },
  {
    icon: Mail,
    title: "Email Notifications",
    description:
      "Participants receive beautifully designed emails when they're invited, when assignments are made, and for important reminders. No one misses out.",
    highlight: "Automatic reminders",
  },
  {
    icon: MapPin,
    title: "Secure Address Sharing",
    description:
      "Participants add their delivery address once. It's encrypted and shared only with their assigned Secret Santa - no one else can see it.",
    highlight: "Encrypted storage",
  },
  {
    icon: Lock,
    title: "Passwordless Login",
    description:
      "No passwords to remember. We use secure magic links sent to your email. Click the link, and you're in. Simple and secure.",
    highlight: "Magic link auth",
  },
  {
    icon: Zap,
    title: "2-Minute Setup",
    description:
      "Create your exchange in under 2 minutes. Just enter a name, set your budget, add participant emails, and you're ready to go.",
    highlight: "Lightning fast",
  },
  {
    icon: RefreshCw,
    title: "Re-shuffle Assignments",
    description:
      "Not happy with the preview? Generate new random assignments as many times as you want before confirming. Get the perfect match-up.",
    highlight: "Unlimited reshuffles",
  },
  {
    icon: Bell,
    title: "Gift Status Tracking",
    description:
      "Track the progress of your gift - mark it as bought, shipped, or delivered. Stay organized and never forget where you are in the process.",
    highlight: "Progress tracking",
  },
  {
    icon: Heart,
    title: "Beautiful Experience",
    description:
      "A thoughtfully designed interface that makes organizing your exchange feel magical, not like a chore. Dark mode by default for comfortable viewing.",
    highlight: "Gorgeous dark UI",
  },
  {
    icon: CheckCircle,
    title: "100% Free Forever",
    description:
      "No premium tiers, no feature gates, no ads. GiftWhisper is completely free because we believe gift-giving should be accessible to everyone.",
    highlight: "No hidden costs",
  },
];

export default function FeaturesPage() {
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
            <Link href="/auth/login">
              <button className="px-4 py-2 bg-gradient-gold text-midnight font-semibold rounded-lg hover:opacity-90 transition-opacity">
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-cream mb-6">
              Everything You Need for the{" "}
              <span className="text-gradient-gold">Perfect Gift Exchange</span>
            </h1>
            <p className="text-xl text-cream/70 max-w-2xl mx-auto">
              Powerful features, beautifully simple. GiftWhisper has everything
              to make your Secret Santa effortless.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 hover:border-gold/30 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-midnight" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-display font-semibold text-cream">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-cream/60 text-sm mb-3">
                      {feature.description}
                    </p>
                    <span className="inline-block text-xs px-2 py-1 bg-gold/10 text-gold rounded">
                      {feature.highlight}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Section */}
          <div className="glass-card p-8 mb-16">
            <h2 className="text-2xl font-display font-bold text-cream mb-6 text-center">
              Why Choose GiftWhisper?
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gold/20">
                    <th className="text-left py-3 px-4 text-cream">Feature</th>
                    <th className="text-center py-3 px-4 text-gold">
                      GiftWhisper
                    </th>
                    <th className="text-center py-3 px-4 text-cream/50">
                      Spreadsheets
                    </th>
                    <th className="text-center py-3 px-4 text-cream/50">
                      Paper Slips
                    </th>
                  </tr>
                </thead>
                <tbody className="text-cream/70">
                  <tr className="border-b border-gold/10">
                    <td className="py-3 px-4">Automatic matching</td>
                    <td className="text-center py-3 px-4 text-gold">✓</td>
                    <td className="text-center py-3 px-4">Manual</td>
                    <td className="text-center py-3 px-4">Manual</td>
                  </tr>
                  <tr className="border-b border-gold/10">
                    <td className="py-3 px-4">Exclusion rules</td>
                    <td className="text-center py-3 px-4 text-gold">✓</td>
                    <td className="text-center py-3 px-4">Complex</td>
                    <td className="text-center py-3 px-4">✗</td>
                  </tr>
                  <tr className="border-b border-gold/10">
                    <td className="py-3 px-4">Wishlists</td>
                    <td className="text-center py-3 px-4 text-gold">✓</td>
                    <td className="text-center py-3 px-4">Separate doc</td>
                    <td className="text-center py-3 px-4">✗</td>
                  </tr>
                  <tr className="border-b border-gold/10">
                    <td className="py-3 px-4">Email notifications</td>
                    <td className="text-center py-3 px-4 text-gold">✓</td>
                    <td className="text-center py-3 px-4">Manual</td>
                    <td className="text-center py-3 px-4">✗</td>
                  </tr>
                  <tr className="border-b border-gold/10">
                    <td className="py-3 px-4">Secure address sharing</td>
                    <td className="text-center py-3 px-4 text-gold">✓</td>
                    <td className="text-center py-3 px-4">Not secure</td>
                    <td className="text-center py-3 px-4">✗</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Works remotely</td>
                    <td className="text-center py-3 px-4 text-gold">✓</td>
                    <td className="text-center py-3 px-4">✓</td>
                    <td className="text-center py-3 px-4">✗</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center glass-card p-8">
            <span className="text-5xl mb-6 block">🎁</span>
            <h2 className="text-2xl font-display font-bold text-cream mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-cream/70 mb-6 max-w-xl mx-auto">
              Create your free Secret Santa exchange in under 2 minutes. No
              credit card, no signup fees, no catch.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-8 py-3 bg-gradient-gold text-midnight font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Free Exchange →
            </Link>
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

