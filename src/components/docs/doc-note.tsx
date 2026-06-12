import type { ReactNode } from "react";

const toneClass = {
  info: "bg-surface-low text-on-surface",
  warn: "bg-warning/10 text-on-surface",
  danger: "bg-secondary/10 text-on-surface",
} as const;

export function DocNote({
  title,
  tone = "info",
  children,
}: {
  title: string;
  tone?: keyof typeof toneClass;
  children: ReactNode;
}) {
  return (
    <aside
      className={`not-prose my-5 rounded-md border border-outline-variant/60 p-4 text-sm dark:border-white/[0.08] ${toneClass[tone]}`}
    >
      <p className="mb-1 font-semibold text-on-surface">{title}</p>
      <div className="leading-6 text-on-surface-variant">{children}</div>
    </aside>
  );
}
