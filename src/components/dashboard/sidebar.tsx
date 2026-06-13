"use client";

import {
  BookOpen,
  Boxes,
  ChevronsUpDown,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  LogOut,
  Settings,
  ShieldUser,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AccountSettingsDialog } from "@/components/account/account-settings-dialog";
import { StarOfLifeMark } from "@/components/brand/star-of-life-mark";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  professor?: boolean; // visible to professors
};

type NavGroup = { label?: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        professor: true,
      },
    ],
  },
  {
    label: "Registry",
    items: [
      {
        href: "/dashboard/students",
        label: "Students",
        icon: GraduationCap,
        adminOnly: true,
      },
      {
        href: "/dashboard/graduates",
        label: "Graduates",
        icon: Users,
        adminOnly: true,
      },
      {
        href: "/dashboard/batches",
        label: "Batches",
        icon: FolderOpen,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/dashboard/courses",
        label: "Courses",
        icon: Library,
        adminOnly: true,
      },
      { href: "/dashboard/blog", label: "Blog", icon: FileText },
      {
        href: "/dashboard/site-content",
        label: "Homepage CMS",
        icon: LayoutTemplate,
        adminOnly: true,
      },
      {
        href: "/dashboard/forms",
        label: "Forms",
        icon: ClipboardList,
        adminOnly: true,
      },
      {
        href: "/dashboard/models",
        label: "3D Models",
        icon: Boxes,
        adminOnly: true,
      },
      { href: "/docs", label: "Docs", icon: BookOpen },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/dashboard/staff",
        label: "Staff",
        icon: ShieldUser,
        adminOnly: true,
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

function visibleGroups(role: Role): NavGroup[] {
  return GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => {
      if (role === "admin") return true;
      if (role === "professor") return i.professor === true;
      return false; // graduates/legacy roles never reach the dashboard shell
    }),
  })).filter((g) => g.items.length > 0);
}

function NavUser({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-white/[0.04]">
          <Avatar
            name={name}
            className="bg-surface-container text-on-surface dark:bg-surface-high"
          />
          <div className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-sm font-medium text-on-surface">
              {name}
            </span>
            <span className="truncate text-xs text-on-surface-variant">
              {email}
            </span>
          </div>
          <ChevronsUpDown className="size-4 text-on-surface-variant" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-60">
          <DropdownMenuLabel>
            <p className="text-sm font-medium text-on-surface">{name}</p>
            <p className="text-xs capitalize text-on-surface-variant">{role}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <Settings /> Account settings
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/" target="_blank">
              <ExternalLink /> View public site
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-secondary focus:bg-secondary/10 [&_svg]:text-secondary"
            onSelect={async () => {
              await authClient.signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        name={name}
        email={email}
        role={role}
      />
    </>
  );
}

export function DashboardSidebar({
  role,
  name,
  email,
}: {
  role: Role;
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const groups = visibleGroups(role);

  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 flex-col border-r border-outline-variant bg-sidebar text-on-surface md:flex",
        /* Dark: sidebar is the basement — visibly darker than the canvas.
           Separation is by luminance + the right-edge hairline, not hue alone. */
        "dark:border-white/[0.06]",
      )}
    >
      <div className="flex h-16 items-center gap-2 px-5 font-semibold">
        <StarOfLifeMark className="size-5 text-accent" />
        <span>WSL EMS</span>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
        {groups.map((group, gi) => (
          <div key={group.label ?? `g${gi}`} className="flex flex-col gap-1">
            {group.label && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant/70">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active
                      ? "bg-accent/[0.08] font-semibold text-accent"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:hover:bg-white/[0.04]",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-outline-variant p-3 dark:border-white/[0.06]">
        <NavUser name={name} email={email} role={role} />
      </div>
    </aside>
  );
}

export function DashboardMobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = visibleGroups(role).flatMap((g) => g.items);
  return (
    <nav className="flex gap-1 overflow-x-auto border-outline-variant/60 border-b bg-card px-2 py-2 md:hidden">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "bg-accent/[0.1] font-semibold text-accent"
                : "text-on-surface-variant hover:bg-surface-container",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
