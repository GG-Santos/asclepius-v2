import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export function OpenRoute({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="not-prose my-2 inline-flex h-9 items-center gap-2 rounded-md border border-outline-variant bg-card px-3 text-sm font-semibold text-on-surface transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.1]"
    >
      {children}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}
