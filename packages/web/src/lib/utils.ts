import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function asLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  // A date column comes back as YYYY-MM-DD. Parsing that with Date
  // treats it as UTC midnight and shifts the calendar day in India.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(date);
}

export function formatDate(date: string | Date): string {
  return asLocalDate(date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: string | Date): string {
  return asLocalDate(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function dateInputValue(date: string | null | undefined): string {
  const match = date ? /^(\d{4}-\d{2}-\d{2})/.exec(date) : null;
  return match ? match[1] : "";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
