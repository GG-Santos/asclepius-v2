"use client";

import {
  BookOpen,
  ChevronsUpDown,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  ShieldCheck,
  ShieldUser,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
};

type NavGroup = { label?: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }] },
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
    items: g.items.filter((i) => !i.adminOnly || role === "admin"),
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-on-primary/10 focus:outline-none">
        <Avatar name={name} className="bg-on-primary/15 text-on-primary" />
        <div className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-medium text-on-primary">
            {name}
          </span>
          <span className="truncate text-xs text-on-primary-container/70">
            {email}
          </span>
        </div>
        <ChevronsUpDown className="size-4 text-on-primary-container/70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-60">
        <DropdownMenuLabel>
          <p className="text-sm font-medium text-on-surface">{name}</p>
          <p className="text-xs capitalize text-on-surface-variant">{role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
    <aside className="hidden w-64 shrink-0 flex-col bg-primary text-on-primary md:flex">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold">
        <ShieldCheck className="size-5 text-accent-bright" aria-hidden />
        <span>WSL EMS</span>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
        {groups.map((group, gi) => (
          <div key={group.label ?? `g${gi}`} className="flex flex-col gap-1">
            {group.label && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-on-primary-container/50">
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
                    active
                      ? "bg-on-primary/15 text-on-primary"
                      : "text-on-primary-container hover:bg-on-primary/10 hover:text-on-primary",
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

      <div className="border-t border-on-primary/10 p-3">
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
              active
                ? "bg-primary text-on-primary"
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
