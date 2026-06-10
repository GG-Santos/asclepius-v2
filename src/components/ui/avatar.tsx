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
  src,
  className,
}: {
  name: string;
  /** Avatar image URL (user.image). Initials remain the fallback. */
  src?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent/15 text-xs font-semibold text-accent",
        className,
      )}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: user-uploaded blob avatar on an arbitrary domain
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
