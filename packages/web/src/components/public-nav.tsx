"use client";

import { ElfMark } from "@/components/mark";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "What you can set" },
  { href: "/family-and-office", label: "Family or office" },
  { href: "/faq", label: "Questions" },
];

export function PublicNav() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ivory/90 backdrop-blur-sm">
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
                className="bg-cranberry px-2.5 py-2 text-sm font-semibold text-ivory hover:bg-cranberry-deep sm:px-3.5"
              >
                <span className="sm:hidden">Create</span>
                <span className="hidden sm:inline">Create an exchange</span>
              </Link>
            </>
          )}
        </div>
      </div>
      <nav
        aria-label="Sections"
        className="flex gap-4 overflow-x-auto border-t border-rule px-4 py-2 text-sm md:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 text-ink-soft">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
