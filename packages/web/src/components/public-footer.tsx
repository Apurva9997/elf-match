import { ElfMark } from "@/components/mark";
import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-rule bg-ivory-deep/60">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <ElfMark />
            <span className="font-display text-xl text-evergreen">Elf Match</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
            A free organizer for Secret Santa and other gift exchanges. Set a
            budget and a date, invite people by email, collect wishlists, and
            send each person a private assignment.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Organize
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/how-it-works" className="text-ink-soft hover:text-ink">
                How an exchange runs
              </Link>
            </li>
            <li>
              <Link href="/features" className="text-ink-soft hover:text-ink">
                What you can set
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-ink-soft hover:text-ink">
                Questions
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
            The desk
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="text-ink-soft hover:text-ink">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-ink-soft hover:text-ink">
                Terms
              </Link>
            </li>
            <li>
              <a href="mailto:hello@elfmatch.com" className="text-ink-soft hover:text-ink">
                hello@elfmatch.com
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-rule px-4 py-4 text-center text-xs text-ink-faint sm:px-6">
        © {new Date().getFullYear()} Elf Match. Assignments stay with the person who is giving.
      </div>
    </footer>
  );
}
