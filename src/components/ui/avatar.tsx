import { cn } from "@/lib/utils";

export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xs font-semibold text-accent",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
