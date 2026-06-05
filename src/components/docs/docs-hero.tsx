import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";

type CTA = { label: string; href: string };

// Branded docs landing hero. Solid bg-primary sits behind the gradient as a
// fallback so the light hero text always lands on a navy surface.
export function DocsHero({
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
  chips = [],
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primary?: CTA;
  secondary?: CTA;
  chips?: string[];
}) {
  return (
    <div className="not-prose relative mb-12 overflow-hidden rounded-xl border border-outline-variant/40 bg-primary bg-linear-to-br from-primary to-primary-container px-6 py-10 sm:px-10 sm:py-14">
      <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          {eyebrow ? (
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-on-primary-container">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-balance text-3xl font-bold leading-tight text-on-primary sm:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-on-primary-container">
              {subtitle}
            </p>
          ) : null}
          {primary || secondary ? (
            <div className="mt-7 flex flex-wrap gap-3">
              {primary ? (
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-primary hover:bg-on-primary-container hover:text-primary"
                >
                  <Link href={primary.href}>
                    {primary.label}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ) : null}
              {secondary ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-on-primary/30 bg-transparent text-on-primary hover:border-on-primary hover:bg-on-primary/10 hover:text-on-primary"
                >
                  <Link href={secondary.href}>{secondary.label}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
          {chips.length > 0 ? (
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-primary-container">
              {chips.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5">
                  <span
                    className="size-1.5 rounded-full bg-accent-bright"
                    aria-hidden
                  />
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="hidden lg:block" aria-hidden>
          <div className="rotate-1 rounded-lg border border-outline-variant/60 bg-card p-4 shadow-[var(--shadow-clinical-md)]">
            <div className="flex items-center gap-3">
              <div className="size-14 shrink-0 rounded-md bg-surface-highest" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">
                  Jordan A. Cruz
                </p>
                <p className="font-mono text-xs text-on-surface-variant">
                  A09-240801
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-outline-variant/60 pt-3">
              <StatusBadge status="verified" />
              <span className="text-[10px] text-on-surface-variant">
                Valid until Aug 2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
