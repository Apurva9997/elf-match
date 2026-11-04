import { ElfMark } from "@/components/mark";
import Link from "next/link";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "What you can set" },
  { href: "/family-and-office", label: "Family or office" },
  { href: "/faq", label: "Questions" },
  { href: "/secret-santa-with-exclusions", label: "Exclusions" },
];

export function PublicNav() {
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
          <details className="relative md:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center text-evergreen [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open menu</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </summary>
            <nav
              aria-label="Sections"
              className="absolute right-0 top-full z-50 w-[min(16rem,calc(100vw-2rem))] border border-rule bg-ivory px-4 py-2 shadow-paper"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 items-center text-ink"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/auth/login?intent=create"
                className="flex min-h-11 items-center font-semibold text-cranberry sm:hidden"
              >
                Create an exchange
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
