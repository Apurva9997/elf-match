"use client";

import { ElfMark } from "@/components/mark";
import { useAuth } from "@/lib/auth-context";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "What you can set" },
  { href: "/family-and-office", label: "Family or office" },
  { href: "/faq", label: "Questions" },
  { href: "/secret-santa-with-exclusions", label: "Exclusions" },
];

export function PublicNav() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ivory/95">
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
              className="hidden bg-evergreen px-3.5 py-2 text-sm font-semibold text-ivory hover:bg-evergreen-deep sm:inline-flex"
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
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-evergreen md:hidden"
            aria-expanded={open}
            aria-controls="mobile-sections"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-sections"
          aria-label="Sections"
          className="border-t border-rule px-4 py-2 md:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center text-ink"
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center font-semibold text-evergreen sm:hidden"
            >
              Your exchanges
            </Link>
          ) : (
            <Link
              href="/auth/login?intent=create"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center font-semibold text-cranberry sm:hidden"
            >
              Create an exchange
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
