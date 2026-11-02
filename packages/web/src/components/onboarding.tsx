"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type OnboardingPersona = "new_user" | "admin" | "member";

type TourStep = {
  id: string;
  title: string;
  sentence: string;
  image: string;
  imageAlt: string;
};

const organizerSteps: TourStep[] = [
  {
    id: "name",
    title: "Name the exchange",
    sentence:
      "Give it a name people will recognize, and add a budget and dates if you want them.",
    image: "/film/stages/write.jpg",
    imageAlt: "A blank card and a pen on a lit desk.",
  },
  {
    id: "invite",
    title: "Send one invite link",
    sentence:
      "Copy the link, and the message beside it, into the group chat. You can also invite people by email.",
    image: "/film/stages/gather.jpg",
    imageAlt: "A stack of blank cards tied with a green ribbon.",
  },
  {
    id: "join",
    title: "People join and write wishes",
    sentence:
      "Anyone who opens the link and signs in joins as themselves. A draw needs at least three people who have joined. Pending invitations are left out.",
    image: "/film/stages/wait.jpg",
    imageAlt: "One sealed envelope on the desk.",
  },
  {
    id: "draw",
    title: "Preview, then send",
    sentence:
      "You see every pairing. Confirming emails each person their recipient’s name. After those emails go out, the names cannot be redrawn.",
    image: "/film/stages/preview.jpg",
    imageAlt: "A row of blank folded cards and a wax seal.",
  },
];

const memberSteps: TourStep[] = [
  {
    id: "joined",
    title: "You are in",
    sentence: "Open the exchange from your list. You see this group, and no one else’s.",
    image: "/film/stages/gather.jpg",
    imageAlt: "A stack of blank cards tied with a green ribbon.",
  },
  {
    id: "wish",
    title: "Write a wish, or skip the letter",
    sentence:
      "A title is enough. A shop link and a price are optional. Skipping the letter is not the same as sending one.",
    image: "/film/stages/write.jpg",
    imageAlt: "A blank card and a pen on a lit desk.",
  },
  {
    id: "address",
    title: "Add an address only if you want delivery",
    sentence:
      "An address is optional. If you add one, only the person buying for you can read it.",
    image: "/film/stages/wait.jpg",
    imageAlt: "One sealed envelope on the desk.",
  },
  {
    id: "name",
    title: "After the draw, open only your recipient",
    sentence:
      "You see one name, and that person’s wishlist. You do not see the rest of the draw.",
    image: "/film/stages/prepare.jpg",
    imageAlt: "A wrapped gift beside a blank card.",
  },
];

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: () => void;
  onGoToTeam: (teamId: string) => void;
  persona: OnboardingPersona;
  firstTeamId?: string;
  firstTeamName?: string;
  drawn?: boolean;
}

export function Onboarding({
  isOpen,
  onClose,
  onCreateTeam,
  onGoToTeam,
  persona,
  firstTeamId,
  firstTeamName,
  drawn = false,
}: OnboardingProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const steps = persona === "member" ? memberSteps : organizerSteps;
  const heading =
    persona === "member"
      ? firstTeamName || "This exchange"
      : persona === "admin"
        ? firstTeamName || "Your exchange"
        : "How an exchange works";

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-evergreen-deep/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex max-h-[92svh] w-full max-w-xl flex-col border border-rule bg-ivory-card shadow-paper"
          onClick={(event) => event.stopPropagation()}
        >
              <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cranberry">
                    How it works
                  </p>
                  <h2 id={titleId} className="mt-1 font-display text-2xl text-evergreen">
                    {heading}
                  </h2>
                  {persona === "admin" && drawn && (
                    <p className="mt-1 text-sm text-ink-soft">
                      The names are already drawn. They cannot be redrawn.
                    </p>
                  )}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-11 w-11 shrink-0 place-items-center text-ink-soft hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4">
                <ol className="space-y-6">
                  {steps.map((step, index) => (
                    <li key={step.id} className="border-b border-rule pb-6 last:border-0">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cranberry">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-1 font-display text-xl text-ink">{step.title}</h3>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={step.image}
                        alt={step.imageAlt}
                        className="mt-3 aspect-video w-full border border-rule object-cover"
                      />
                      <p className="mt-3 leading-relaxed text-ink-soft">{step.sentence}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-rule px-5 py-4">
                {persona === "new_user" && (
                  <Button
                    type="button"
                    onClick={() => {
                      onCreateTeam();
                      onClose();
                    }}
                  >
                    Create an exchange
                  </Button>
                )}
                {persona !== "new_user" && firstTeamId && (
                  <Button
                    type="button"
                    onClick={() => {
                      onGoToTeam(firstTeamId);
                      onClose();
                    }}
                  >
                    Go to {firstTeamName || "the exchange"}
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
        </div>
      </div>
    </>
  );
}
