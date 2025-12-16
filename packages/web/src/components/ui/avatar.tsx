"use client";

import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size === "xl" ? 64 : size === "lg" ? 48 : size === "md" ? 40 : 32}
        height={size === "xl" ? 64 : size === "lg" ? 48 : size === "md" ? 40 : 32}
        className={cn(
          "rounded-full object-cover border-2 border-gold/20",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-gold flex items-center justify-center font-semibold text-midnight",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
