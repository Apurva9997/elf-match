"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export function PublicNav() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-gold/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🎁</span>
            <span className="font-display text-xl font-semibold text-cream">
              GiftWhisper
            </span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/features"
              className="text-cream/70 hover:text-cream transition-colors hidden sm:block"
            >
              Features
            </Link>
            <Link
              href="/faq"
              className="text-cream/70 hover:text-cream transition-colors hidden sm:block"
            >
              FAQ
            </Link>
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
                  <Button>Get Started Free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
