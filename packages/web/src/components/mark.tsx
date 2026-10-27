import { cn } from "@/lib/utils";

/** Small folded-note mark used as the Elf Match wordmark, not a logo illustration. */
export function ElfMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-7 w-7 text-evergreen", className)}
    >
      <path
        d="M5 7.5h22v14.2L16 28 5 21.7V7.5Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M5 7.5 16 13.2 27 7.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M16 13.2V28" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
