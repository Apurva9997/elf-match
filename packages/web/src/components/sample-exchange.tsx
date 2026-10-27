"use client";

import { useReducedMotion } from "framer-motion";
import { useState } from "react";

const people = [
  { name: "Priya N.", note: "Joined · wishlist started", waiting: false },
  { name: "Arun M.", note: "Joined · wishlist empty", waiting: false },
  { name: "Leela K.", note: "Invitation still open", waiting: true },
  { name: "Dev S.", note: "Joined · three wishes", waiting: false },
];

export function SampleExchange() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <figure>
      <div className="tag-press paper-grain relative border border-rule bg-ivory-card p-5 shadow-paper sm:p-6">
        <div
          aria-hidden
          className="absolute -left-3 top-8 hidden h-16 w-6 bg-cranberry sm:block"
          style={{ clipPath: "polygon(0 8%, 100% 0, 100% 100%, 0 92%)" }}
        />
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-rule pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
              Sample
            </p>
            <p className="mt-1 font-display text-2xl text-evergreen">
              Cousins, December
            </p>
          </div>
          <p className="border border-evergreen/20 px-2 py-1 font-mono text-xs uppercase tracking-wider text-evergreen">
            Collecting wishes
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink-soft">Budget</dt>
            <dd className="mt-0.5 font-medium text-ink">₹500 – ₹1,000</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink-soft">Exchange</dt>
            <dd className="mt-0.5 font-medium text-ink">21 December</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink-soft">Wishlists due</dt>
            <dd className="mt-0.5 font-medium text-ink">12 December</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink-soft">People</dt>
            <dd className="mt-0.5 font-medium text-ink">3 joined · 1 waiting</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-rule pt-4">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Who has joined</p>
          <ul className="mt-2 divide-y divide-rule">
            {people.map((person) => (
              <li key={person.name} className="flex items-baseline justify-between gap-3 py-2">
                <span className="font-medium text-ink">{person.name}</span>
                <span className={person.waiting ? "text-sm text-cranberry" : "text-sm text-ink-soft"}>
                  {person.note}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-4 overflow-hidden border-t border-dashed border-rule">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 origin-top bg-ivory-deep"
            style={{
              transform: open ? "rotateX(0deg)" : "rotateX(-92deg)",
              transition: reduce ? "none" : "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          />
          <div hidden={!open} className="bg-evergreen-soft/70 px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-wider text-evergreen">
              Sample · for the giver only
            </p>
            <p
              className="mt-1 font-display text-lg text-ink"
              style={{
                opacity: open ? 1 : 0,
                transition: reduce ? "none" : "opacity 180ms linear 180ms",
              }}
            >
              You are buying for Meera.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              A hardcover notebook. Stay inside ₹500 – ₹1,000.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-3 text-sm font-semibold text-evergreen underline-offset-2 hover:underline"
      >
        {open ? "Show the group tag" : "Show a participant’s note"}
      </button>
    </figure>
  );
}
