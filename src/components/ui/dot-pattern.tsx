import { cn } from "@/lib/utils";

export function DotPattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--color-primary) 42%, transparent) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    />
  );
}
