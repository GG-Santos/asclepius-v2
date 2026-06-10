"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import {
  ChevronsUpDown,
  Contact,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Inbox,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Quote,
  Search,
  Settings,
  ShieldCheck,
  ShieldUser,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { NavDocs } from "@/components/dashboard/nav-docs";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
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
      {
        href: "/dashboard/testimonials",
        label: "Testimonials",
        icon: Quote,
        adminOnly: true,
      },
      {
        href: "/dashboard/team",
        label: "Team",
        icon: Contact,
        adminOnly: true,
      },
      { href: "/dashboard/blog", label: "Blog", icon: FileText },
      {
        href: "/dashboard/assets",
        label: "Assets",
        icon: Layers,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/dashboard/inquiries",
        label: "Inquiries",
        icon: Inbox,
        adminOnly: true,
      },
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
      return !i.adminOnly; // writer
    }),
  })).filter((g) => g.items.length > 0);
}

function SidebarSearch({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const query = q.trim().toLowerCase();
  const matches = query
    ? items.filter((i) => i.label.toLowerCase().includes(query)).slice(0, 6)
    : [];

  function go(href: string) {
    setQ("");
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="relative px-3 pb-2">
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-3.5 text-on-surface-variant/60" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (matches[0]) go(matches[0].href);
              else if (q.trim())
                go(`/dashboard/graduates?q=${encodeURIComponent(q.trim())}`);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search…"
          aria-label="Search the site"
          className="w-full rounded-md border border-outline-variant bg-card py-1.5 pr-2 pl-8 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-white/[0.08] dark:bg-surface-low"
        />
      </div>
      {open && query && (
        <div className="absolute right-3 left-3 z-50 mt-1 overflow-hidden rounded-md border border-outline-variant/60 bg-card py-1 shadow-[var(--shadow-clinical-md)]">
          {matches.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.href}
                type="button"
                onMouseDown={() => go(m.href)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-on-surface hover:bg-surface-container"
              >
                <Icon className="size-4 text-on-surface-variant" />
                {m.label}
              </button>
            );
          })}
          <button
            type="button"
            onMouseDown={() =>
              go(`/dashboard/graduates?q=${encodeURIComponent(q.trim())}`)
            }
            className="flex w-full items-center gap-2 border-outline-variant/40 border-t px-3 py-1.5 text-left text-xs text-on-surface-variant hover:bg-surface-container"
          >
            <Search className="size-3.5" />
            Search graduates for “{q.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}

function NavUser({
  name,
  email,
  role,
  image,
}: {
  name: string;
  email: string;
  role: Role;
  image?: string | null;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-white/[0.04]",
          !open && "justify-center",
        )}
      >
        <Avatar
          name={name}
          src={image}
          className="shrink-0 bg-surface-container text-on-surface dark:bg-surface-high"
        />
        {open && (
          <div className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-sm font-medium text-on-surface">
              {name}
            </span>
            <span className="truncate text-xs text-on-surface-variant">
              {email}
            </span>
          </div>
        )}
        {open && (
          <ChevronsUpDown className="size-4 shrink-0 text-on-surface-variant" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-60">
        <DropdownMenuLabel>
          <p className="text-sm font-medium text-on-surface">{name}</p>
          <p className="text-xs capitalize text-on-surface-variant">{role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings /> Account settings
          </Link>
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
  );
}

export function AppSidebar({
  role,
  name,
  email,
  image,
  pageTree,
  pendingReviews = 0,
}: {
  role: Role;
  name: string;
  email: string;
  image?: string | null;
  pageTree?: PageTree.Root;
  pendingReviews?: number;
}) {
  const pathname = usePathname();
  const groups = visibleGroups(role);
  const { open } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className={cn(!open ? "justify-center" : "px-5")}>
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 font-semibold",
            open ? "min-w-0" : "p-3",
          )}
        >
          <ShieldCheck className="size-5 shrink-0 text-accent" aria-hidden />
          {open && <span className="truncate">WSL EMS</span>}
        </Link>
      </SidebarHeader>

      {open && <SidebarSearch items={groups.flatMap((g) => g.items)} />}

      <SidebarContent>
        <nav className="flex flex-1 flex-col py-1">
          {groups.map((group, gi) => (
            <SidebarGroup key={group.label ?? `g${gi}`}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link
                        href={item.href}
                        title={!open ? item.label : undefined}
                        className={cn(
                          "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          open ? "gap-3 px-3" : "justify-center px-0",
                          active
                            ? "bg-accent/[0.08] font-semibold text-accent"
                            : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface dark:hover:bg-white/[0.04]",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {open && (
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {item.label}
                          </span>
                        )}
                        {open &&
                          item.href === "/dashboard/batches" &&
                          pendingReviews > 0 && (
                            <span className="ml-auto shrink-0 rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-on-warning">
                              {pendingReviews}
                            </span>
                          )}
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
          {pageTree && role === "admin" ? <NavDocs tree={pageTree} /> : null}
        </nav>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <NavUser name={name} email={email} role={role} image={image} />
      </SidebarFooter>
    </Sidebar>
  );
}
