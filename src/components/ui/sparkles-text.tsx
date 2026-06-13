import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SparklesText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <span
        aria-hidden
        className="-right-2 -top-1 absolute size-1.5 rounded-full bg-accent-bright/70 shadow-[0_0_12px_var(--color-accent)]"
      />
      <span
        aria-hidden
        className="-left-1 bottom-0 absolute size-1 rounded-full bg-accent/60"
      />
      {children}
    </span>
  );
}
