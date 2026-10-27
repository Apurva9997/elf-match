"use client";

import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "gold";
}

const variants = {
  default: "bg-ivory-deep text-ink-soft",
  success: "bg-evergreen-soft text-evergreen",
  warning: "bg-[#F3E8D4] text-[#6E4A22]",
  error: "bg-cranberry-soft text-cranberry",
  gold: "bg-evergreen-soft text-evergreen",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
