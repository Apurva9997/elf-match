"use client";

import { PublicNav } from "@/components/public-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Gift,
  Heart,
  Lock,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Users,
    title: "Create Your Exchange",
    description:
      "Set up your Secret Santa in under 2 minutes. Invite friends, family, or coworkers via email.",
  },
  {
    icon: Gift,
    title: "Build Wishlists",
    description:
      "Share what you'd love to receive. Add links, descriptions, and price estimates.",
  },
  {
    icon: Shield,
    title: "Exclusion Rules",
    description:
      "Prevent couples or family members from being matched. You control the rules.",
  },
  {
    icon: Sparkles,
    title: "Magic Matching",
    description:
      "Our algorithm ensures fair, random assignments while respecting all exclusions.",
  },
];

const benefits = [
  { icon: Zap, text: "Set up in under 2 minutes" },
  { icon: Lock, text: "100% free, no hidden costs" },
  { icon: CheckCircle, text: "No app download required" },
  { icon: Heart, text: "Works for any group size" },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <PublicNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-6xl mb-6 block animate-float">🎁</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-cream mb-6">
              The Simplest Way to Organize{" "}
              <span className="text-gradient-gold">Secret Santa</span>
            </h1>
            <p className="text-lg sm:text-xl text-cream/70 mb-4 max-w-2xl mx-auto">
              Create your gift exchange in under 2 minutes. No spreadsheets, no
              stress—just holiday magic.
            </p>
            <p className="text-sm text-cream/50 mb-8">
              ✨ 100% Free • No Credit Card Required • Works on Any Device
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={isAuthenticated ? "/dashboard" : "/auth/login"}>
                <Button size="md" className="w-full sm:w-auto">
                  {isAuthenticated ? "Go to Dashboard" : "Create Free Exchange"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  See How It Works
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Benefits Bar */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-y border-gold/10 bg-midnight-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center justify-center gap-2 text-cream/70"
              >
                <benefit.icon className="w-5 h-5 text-gold" />
                <span className="text-sm">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-cream mb-4">
              Everything You Need for the Perfect Gift Exchange
            </h2>
            <p className="text-cream/60 max-w-2xl mx-auto">
              Simple, elegant, and designed to make organizing Secret Santa a
              joy, not a chore.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass-card p-6 hover:border-gold/30 hover:shadow-glow transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-midnight" />
                </div>
                <h3 className="text-lg font-display font-semibold text-cream mb-2">
                  {feature.title}
                </h3>
                <p className="text-cream/60 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-midnight-50/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-cream mb-4">
              Get Started in 3 Easy Steps
            </h2>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Create Your Exchange",
                description:
                  "Enter a name, set your budget range, and pick the exchange date. Takes 30 seconds.",
              },
              {
                step: "2",
                title: "Invite Your Group",
                description:
                  "Add email addresses of everyone participating. They'll get an invite to join and create their wishlist.",
              },
              {
                step: "3",
                title: "We Handle the Rest",
                description:
                  "When everyone's ready, click one button to randomly match everyone. Each person gets a private email with their assignment.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center text-midnight font-bold text-xl">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-display font-semibold text-cream mb-2">
                    {item.title}
                  </h3>
                  <p className="text-cream/60">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-cream mb-4">
              Perfect For Any Group
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🏢",
                title: "Office Parties",
                description:
                  "Organize your workplace Secret Santa without the hassle of paper slips and awkward draws.",
              },
              {
                emoji: "👨‍👩‍👧‍👦",
                title: "Family Gatherings",
                description:
                  "Coordinate across generations and locations. Set exclusions so couples don't get each other.",
              },
              {
                emoji: "👯",
                title: "Friend Groups",
                description:
                  "Make your friend group's gift exchange memorable with wishlists everyone can see.",
              },
            ].map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card p-6 text-center"
              >
                <span className="text-4xl mb-4 block">{useCase.emoji}</span>
                <h3 className="text-lg font-display font-semibold text-cream mb-2">
                  {useCase.title}
                </h3>
                <p className="text-cream/60 text-sm">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8 sm:p-12 text-center relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-glow opacity-50" />

            <div className="relative z-10">
              <span className="text-5xl mb-6 block">✨</span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-cream mb-4">
                Ready to Make Gift-Giving Effortless?
              </h2>
              <p className="text-cream/70 mb-8 max-w-xl mx-auto">
                Create your free Secret Santa exchange in under 2 minutes. No
                signup fees, no credit card, no catch.
              </p>
              <Link href={isAuthenticated ? "/dashboard" : "/auth/login"}>
                <Button size="md">
                  {isAuthenticated
                    ? "Go to Dashboard"
                    : "Create Your Free Exchange"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gold/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">🎁</span>
                <span className="font-display text-xl font-semibold text-cream">
                  GiftWhisper
                </span>
              </div>
              <p className="text-cream/50 text-sm max-w-md">
                The simplest way to organize Secret Santa gift exchanges.
                Created with ❤️ for the holiday season.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-cream mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/features"
                    className="text-cream/50 hover:text-cream transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-it-works"
                    className="text-cream/50 hover:text-cream transition-colors"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-cream/50 hover:text-cream transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-cream mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="text-cream/50 hover:text-cream transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-cream/50 hover:text-cream transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:hello@giftwhisper.online"
                    className="text-cream/50 hover:text-cream transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gold/10 text-center text-cream/40 text-sm">
            © {new Date().getFullYear()} GiftWhisper. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
