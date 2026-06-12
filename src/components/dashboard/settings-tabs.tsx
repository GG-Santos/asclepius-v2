"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/settings", label: "Account", adminOnly: false },
  {
    href: "/dashboard/settings/templates",
    label: "Templates",
    adminOnly: true,
  },
  {
    href: "/dashboard/settings/expiry",
    label: "Expiry policy",
    adminOnly: true,
  },
];

export function SettingsTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Settings sections"
      className="flex gap-1 border-b border-outline-variant/60 dark:border-white/[0.08]"
    >
      {TABS.filter((t) => isAdmin || !t.adminOnly).map((tab) => {
        const active =
          tab.href === "/dashboard/settings"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "border-accent text-accent"
                : "border-transparent text-on-surface-variant hover:text-on-surface",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
