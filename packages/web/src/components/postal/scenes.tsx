"use client";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * North Pole postal scenes. These components only draw.
 * The caller decides when a save succeeded and whether to play.
 */

export function usePrefersReducedMotion() {
  return useReducedMotion() === true;
}

export function useSkip(active: boolean, onSkip: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onSkip]);
}

export function SkipNote({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="mt-4 min-h-11 px-3 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
    >
      Skip
    </button>
  );
}

export function Envelope({
  flap,
  letter,
  stamp,
  className,
}: {
  flap: "open" | "shut";
  letter?: boolean;
  stamp?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative mx-auto w-64 sm:w-72", className)} aria-hidden="true">
      <div className="relative aspect-[5/3.4] overflow-hidden rounded-sm border border-[#c9b89a] bg-[#f3e6cf] shadow-paper">
        <div className="absolute inset-x-3 bottom-3 top-8 border border-dashed border-[#c9b89a]/80" />
        {letter && (
          <div
            className="postal-letter absolute inset-x-6 top-4 h-[78%] rounded-sm border border-rule bg-ivory-card px-3 py-2 shadow-sm"
            data-state={flap === "shut" ? "tucked" : "resting"}
          >
            <div className="h-1.5 w-2/3 rounded-sm bg-evergreen/20" />
            <div className="mt-2 h-1 w-full rounded-sm bg-ink/10" />
            <div className="mt-1.5 h-1 w-5/6 rounded-sm bg-ink/10" />
            <div className="mt-1.5 h-1 w-3/5 rounded-sm bg-ink/10" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-[#e7d3b0] to-[#f6e7cf]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom [clip-path:polygon(0_100%,50%_18%,100%_100%)] bg-[#eddcbd]" />
        <div
          className="postal-flap absolute inset-x-0 top-0 h-[58%] origin-top bg-[#e4c99a] shadow-sm [clip-path:polygon(0_0,100%_0,50%_100%)]"
          data-state={flap}
        />
        {stamp && (
          <div className="postal-stamp absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-sm border-2 border-dashed border-cranberry bg-cranberry-soft text-[9px] font-semibold uppercase tracking-wide text-cranberry">
            North
            <br />
            Pole
          </div>
        )}
      </div>
    </div>
  );
}

export function StampSeal({ pressed }: { pressed: boolean }) {
  return (
    <div
      className={cn("postal-seal", pressed && "is-pressed")}
      aria-hidden="true"
    >
      <span>Sent</span>
    </div>
  );
}

/** Letter in an open envelope, used as the stationery frame around a form. */
export function LetterDesk({
  children,
  stamp,
}: {
  children: React.ReactNode;
  stamp?: boolean;
  sealed?: boolean;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -left-2 -right-2 -top-3 bottom-8 hidden sm:block" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-40 rounded-sm border border-[#c9b89a] bg-[#f3e6cf] shadow-paper" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[#eddcbd] [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
      </div>
      <div className="relative rounded-sm border border-rule bg-[#fffdf8] px-4 py-5 shadow-paper sm:mx-6 sm:mt-8 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
            A letter to the North Pole
          </p>
          {stamp && (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border-2 border-dashed border-cranberry bg-cranberry-soft text-center text-[8px] font-semibold uppercase leading-tight tracking-wide text-cranberry">
              North Pole
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function SendFlight({
  phase,
}: {
  phase: "stamp" | "tuck" | "flap" | "fly" | "done";
}) {
  const flying = phase === "fly" || phase === "done";
  return (
    <div className="relative mx-auto h-56 w-full max-w-md overflow-hidden" aria-hidden="true">
      <div className={cn("absolute left-1/2 top-8 -translate-x-1/2", flying && "postal-fly")}>
        <Envelope
          flap={phase === "flap" || phase === "fly" || phase === "done" ? "shut" : "open"}
          letter={phase !== "fly" && phase !== "done"}
          stamp={phase !== "stamp"}
        />
        {phase === "stamp" && <StampSeal pressed />}
      </div>
      <div className="absolute bottom-3 left-6 right-6 h-px bg-rule" />
      <p className="absolute bottom-5 right-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        North Pole
      </p>
    </div>
  );
}

export function SantaShop({ playing }: { playing: boolean }) {
  return (
    <div className="relative mx-auto h-48 w-full max-w-md overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 360 180" className="h-full w-full">
        <rect x="0" y="146" width="360" height="34" fill="#EBE4D6" />
        <g className={cn(playing && "postal-santa-walk")}>
          <circle cx="86" cy="92" r="16" fill="#F3D5C4" />
          <path d="M70 94c2 10 8 14 16 14s14-4 16-14c-6 4-26 4-32 0z" fill="#F6F1E7" />
          <path d="M70 84c4-16 28-16 32 0-8-6-24-6-32 0z" fill="#8E3A42" />
          <circle cx="100" cy="70" r="5" fill="#F6F1E7" />
          <rect x="70" y="112" width="32" height="26" rx="6" fill="#8E3A42" />
          <rect x="66" y="128" width="12" height="18" rx="4" fill="#1E3A32" />
          <rect x="94" y="128" width="12" height="18" rx="4" fill="#1E3A32" />
        </g>
        <g>
          <rect x="196" y="42" width="92" height="96" rx="4" fill="#FFFCF6" stroke="#C9B89A" />
          <path d="M208 62h68M208 76h52M208 90h60M208 104h40" stroke="#1C1915" strokeOpacity="0.28" strokeWidth="2" />
          <circle cx="268" cy="118" r="7" fill="#1E3A32" />
        </g>
        <g className={cn(playing && "postal-sack")}>
          <path d="M168 118c-2-14 10-22 22-20 4-10 20-12 26-2 12-2 22 8 20 20-2 16-14 30-34 30s-32-12-34-28z" fill="#6E2A32" />
          <rect x="176" y="104" width="22" height="14" rx="3" fill="#2C5246" />
          <rect x="202" y="108" width="16" height="12" rx="2" fill="#8E3A42" />
        </g>
      </svg>
    </div>
  );
}

export function SleighFlight({ playing }: { playing: boolean }) {
  return (
    <div className="relative mx-auto h-48 w-full max-w-lg overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 460 180" className="h-full w-full">
        <path d="M16 142h300" stroke="#DDD4C4" strokeWidth="2" />
        <g className={cn(playing && "postal-sleigh")}>
          {/* Horse */}
          <path d="M18 118c8-6 16-22 20-34 6-2 16 0 18 8 8-10 24-8 28 2 2 6-2 14-8 16 6 4 10 12 8 20-6 2-14-2-16-8l-8 18c-2 6-10 8-14 4l-6-12c-8 2-18-2-20-10 0-6 4-10 8-12-6-2-10-8-10-12z" fill="#F6F1E7" stroke="#1E3A32" strokeWidth="2" />
          <circle cx="78" cy="86" r="3" fill="#1C1915" />
          <path d="M86 96c8 2 12 8 10 12" stroke="#1E3A32" strokeWidth="2" fill="none" />
          <path d="M30 124v16M46 126v14M62 124v16" stroke="#1E3A32" strokeWidth="2" />
          {/* Reins */}
          <path d="M96 104c18 6 28 4 40-2" stroke="#8A6232" strokeWidth="2" fill="none" />
          {/* Sleigh body */}
          <path d="M132 96c18-16 70-18 108-4 6 2 8 10 4 16l-8 14H140c-10 0-16-8-14-16z" fill="#8E3A42" />
          <path d="M138 122c8 10 24 16 48 16h62c6 0 10 4 10 8H132c-8 0-12-8-8-16z" fill="#6E2A32" />
          <path d="M150 146c10 8 40 10 78 2" stroke="#C9B89A" strokeWidth="3" fill="none" />
          {/* Presents, clearly boxes */}
          <rect x="168" y="78" width="22" height="18" rx="2" fill="#2C5246" stroke="#F6F1E7" />
          <rect x="192" y="70" width="20" height="20" rx="2" fill="#1E3A32" stroke="#F6F1E7" />
          <rect x="214" y="80" width="18" height="16" rx="2" fill="#E4EDE8" stroke="#1E3A32" />
          <path d="M179 78v18M192 80h20M223 80v16" stroke="#F6F1E7" strokeWidth="1.5" />
          {/* Santa seated */}
          <circle cx="156" cy="86" r="9" fill="#F3D5C4" />
          <path d="M146 82c2-12 18-14 22-2-6-3-16-2-22 2z" fill="#8E3A42" />
          <circle cx="166" cy="74" r="3.5" fill="#F6F1E7" />
          <rect x="148" y="94" width="18" height="16" rx="4" fill="#8E3A42" />
        </g>
      </svg>
    </div>
  );
}

export type TrailStep = {
  id: string;
  label: string;
  done: boolean;
  current?: boolean;
};

export function ProgressTrail({ steps }: { steps: TrailStep[] }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Your gifting journey">
      {steps.map((step, index) => (
        <li key={step.id} className="relative">
          <div
            className={cn(
              "flex min-h-16 flex-col justify-between border px-3 py-2",
              step.done
                ? "border-evergreen/30 bg-evergreen-soft"
                : step.current
                  ? "border-cranberry/40 bg-ivory-card"
                  : "border-rule bg-ivory-card"
            )}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={cn("text-sm font-medium", step.done ? "text-evergreen" : "text-ink")}>
              {step.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export type PostalStamp = {
  id: string;
  name: string;
  earned: boolean;
  caption: string;
};

export function StampCollection({ stamps }: { stamps: PostalStamp[] }) {
  const earned = stamps.filter((stamp) => stamp.earned).length;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        Postal stamps · {earned} of {stamps.length}
      </p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {stamps.map((stamp) => (
          <li key={stamp.id} className="shrink-0">
            <div
              className={cn(
                "grid h-[4.5rem] w-[4.5rem] place-items-center rounded-sm border-2 border-dashed text-center",
                stamp.earned
                  ? "border-cranberry bg-cranberry-soft text-cranberry"
                  : "border-rule bg-ivory text-ink-faint"
              )}
              title={stamp.caption}
            >
              <span className="px-1 text-[10px] font-semibold uppercase leading-tight tracking-wide">
                {stamp.earned ? stamp.name : "—"}
              </span>
            </div>
            <p className="mt-1 w-[4.5rem] text-center text-[11px] text-ink-soft">
              {stamp.earned ? stamp.caption : "Not yet"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Phase = "enter" | "wait" | "open" | "name" | "done";

export function AssignmentReveal({
  name,
  budget,
  onDone,
  replay,
}: {
  name: string;
  budget: string | null;
  onDone: () => void;
  replay?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? "done" : "enter");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useSkip(phase !== "done", () => doneRef.current());

  useEffect(() => {
    if (reduced) {
      setPhase("done");
      doneRef.current();
      return;
    }
    const timer = window.setTimeout(() => setPhase("wait"), 900);
    return () => clearTimeout(timer);
  }, [reduced]);

  const open = () => {
    if (phase === "done" || phase === "open" || phase === "name") return;
    setPhase("open");
    window.setTimeout(() => setPhase("name"), 700);
    window.setTimeout(() => {
      setPhase("done");
      doneRef.current();
    }, 1700);
  };

  if (phase === "done") {
    return (
      <div className="py-2 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
          Your assignment
        </p>
        <h3 className="mt-2 font-display text-4xl text-evergreen">{name}</h3>
        {budget && <p className="mt-2 text-ink-soft">{budget}</p>}
      </div>
    );
  }

  return (
    <div className="py-4 text-center" role="dialog" aria-label="Secret assignment">
      <p className="sr-only" aria-live="polite">
        {phase === "wait" || phase === "enter"
          ? "A sealed envelope has arrived. Open your secret assignment."
          : phase === "name"
            ? `You are gifting to ${name}.`
            : "Opening your assignment."}
      </p>
      <div className={cn("mx-auto max-w-xs", phase === "enter" && "postal-arrive")}>
        <button
          type="button"
          onClick={open}
          disabled={phase === "enter"}
          className="mx-auto block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evergreen disabled:cursor-default"
          aria-label="Open your secret assignment"
        >
          <Envelope flap={phase === "open" || phase === "name" ? "open" : "shut"} stamp />
        </button>
      </div>
      {phase === "name" && (
        <div className="postal-card-unfold mx-auto mt-4 max-w-sm border border-rule bg-ivory-card px-6 py-5 shadow-paper">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
            You are gifting to
          </p>
          <p className="mt-2 font-display text-3xl text-evergreen">{name}</p>
        </div>
      )}
      {(phase === "wait") && (
        <p className="mt-4 font-display text-xl text-ink">Open your secret assignment.</p>
      )}
      {replay && phase === "wait" && (
        <p className="mt-1 text-sm text-ink-soft">This is a replay. Nothing is sent.</p>
      )}
      <SkipNote onSkip={onDone} />
    </div>
  );
}

const SEND_PHASES = ["stamp", "tuck", "flap", "fly", "done"] as const;

export function WishlistSendScene({
  onDone,
}: {
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<(typeof SEND_PHASES)[number]>(
    reduced ? "done" : "stamp"
  );
  useSkip(!reduced && phase !== "done", onDone);

  useEffect(() => {
    if (reduced) return;
    const waits = [520, 480, 520, 900];
    let elapsed = 0;
    const timers = waits.map((wait, index) => {
      elapsed += wait;
      return window.setTimeout(() => setPhase(SEND_PHASES[index + 1]), elapsed);
    });
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (phase === "done") {
      const timer = window.setTimeout(() => doneRef.current(), reduced ? 0 : 700);
      return () => clearTimeout(timer);
    }
  }, [phase, reduced]);

  if (reduced) return null;

  return (
    <div className="py-2 text-center" role="status" aria-live="polite">
      <p className="sr-only">Sending your letter to the North Pole.</p>
      <SendFlight phase={phase === "done" ? "fly" : phase} />
      <SkipNote onSkip={onDone} />
    </div>
  );
}

export function Celebration({
  kind,
  title,
  detail,
  onDone,
}: {
  kind: "shop" | "sleigh";
  title: string;
  detail: string;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useSkip(!reduced, () => doneRef.current());

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current(), reduced ? 0 : 2400);
    return () => clearTimeout(timer);
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="py-2 text-center" role="status" aria-live="assertive">
      {kind === "shop" ? <SantaShop playing /> : <SleighFlight playing />}
      <p className="font-display text-2xl text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{detail}</p>
      <SkipNote onSkip={onDone} />
    </div>
  );
}
