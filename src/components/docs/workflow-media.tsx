"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { HeroVideoDialog } from "@/components/ui/hero-video-dialog";

export function WorkflowMedia({
  title,
  slug,
}: {
  title: string;
  slug: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !resolvedTheme) {
    return (
      <section className="not-prose my-6 space-y-3">
        <div>
          <p className="text-sm font-semibold text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant">
            Loading the recording for the current theme.
          </p>
        </div>
        <div className="aspect-video animate-pulse rounded-md border border-outline-variant/60 bg-surface-container dark:border-white/[0.08]" />
      </section>
    );
  }

  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const label = theme === "dark" ? "dark mode" : "light mode";
  const videoSrc = `/doc-media/registry/${slug}/${theme}.webm`;

  return (
    <section className="not-prose my-6 space-y-3">
      <div>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="text-xs text-on-surface-variant">
          Showing the {label} recording because the documentation is currently
          in {label}.
        </p>
      </div>
      <HeroVideoDialog
        key={theme}
        title={`${title} (${label})`}
        videoSrc={videoSrc}
        animationStyle="from-center"
      />
    </section>
  );
}
