"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Gift, Users, Sparkles, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: Users,
    title: "Create Your Team",
    description:
      "Invite friends, family, or coworkers to join your Secret Santa exchange.",
  },
  {
    icon: Gift,
    title: "Build Wishlists",
    description:
      "Share what you'd love to receive. Add links, descriptions, and priorities.",
  },
  {
    icon: Sparkles,
    title: "Magic Matching",
    description:
      "Our algorithm ensures fair, random assignments with exclusion rules.",
  },
  {
    icon: Heart,
    title: "Spread Joy",
    description: "Track gift status and make someone's holiday season magical.",
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎄</span>
              <span className="font-display text-xl font-semibold text-cream">
                Secret Santa
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
              Make Gift-Giving{" "}
              <span className="text-gradient-gold">Magical</span>
            </h1>
            <p className="text-lg sm:text-xl text-cream/70 mb-8 max-w-2xl mx-auto">
              Organize your Secret Santa exchange effortlessly. Create teams,
              share wishlists, and let the holiday magic unfold.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Your Exchange
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
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
              How It Works
            </h2>
            <p className="text-cream/60 max-w-2xl mx-auto">
              Simple, elegant, and designed to spread holiday cheer.
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
                Ready to Spread Some Holiday Cheer?
              </h2>
              <p className="text-cream/70 mb-8 max-w-xl mx-auto">
                Join thousands of teams already using Secret Santa to make their
                gift exchanges memorable and stress-free.
              </p>
              <Link href="/auth/login">
                <Button size="lg">
                  Create Your Team
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gold/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎄</span>
            <span className="font-display text-cream">Secret Santa</span>
          </div>
          <p className="text-cream/50 text-sm">
            Made with ❤️ for the holiday season
          </p>
        </div>
      </footer>
    </div>
  );
}
