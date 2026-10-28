"use client";

import { ElfMark } from "@/components/mark";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "What you can set" },
  { href: "/family-and-office", label: "Family or office" },
  { href: "/faq", label: "Questions" },
  { href: "/secret-santa-with-exclusions", label: "Exclusions" },
];

export function PublicNav() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ivory">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-sm">
          <ElfMark />
          <span className="font-display text-[1.35rem] font-medium tracking-tight text-evergreen">
            Elf Match
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-soft hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="bg-evergreen px-2.5 py-2 text-sm font-semibold text-ivory hover:bg-evergreen-deep sm:px-3.5"
            >
              Your exchanges
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-2 py-2 text-sm font-semibold text-evergreen hover:text-evergreen-deep"
              >
                Sign in
              </Link>
              <Link
                href="/auth/login?intent=create"
                className="hidden bg-cranberry px-3.5 py-2 text-sm font-semibold text-ivory hover:bg-cranberry-deep sm:inline-flex"
              >
                Create an exchange
              </Link>
            </>
          )}
        </div>
      </div>
      <nav
        aria-label="Sections"
        className="flex flex-wrap gap-x-4 gap-y-1 border-t border-rule px-4 py-2 text-sm md:hidden"
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-ink-soft">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
