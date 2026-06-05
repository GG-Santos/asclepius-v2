import type * as React from "react";
import { cn } from "@/lib/utils";

// Outlined style only: 1px border thickening to 2px Clinical Blue on focus.
// Error states use Emergency Red border (apply `aria-invalid`).
export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface shadow-none transition-colors",
        "placeholder:text-on-surface-variant/60",
        "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/30",
        className,
      )}
      {...props}
    />
  );
}
