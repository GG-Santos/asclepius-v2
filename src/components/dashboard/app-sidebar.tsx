"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import {
  ArrowRight,
  BookOpen,
  ChevronsUpDown,
  ClipboardList,
  Contact,
  CornerDownLeft,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Inbox,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  LogOut,
  Quote,
  Search,
  Settings,
  ShieldUser,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AccountSettingsDialog } from "@/components/account/account-settings-dialog";
import { StarOfLifeMark } from "@/components/brand/star-of-life-mark";
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

type DocSearchItem = {
  href: string;
  label: string;
  section: string;
  keywords: string;
  icon: "folder" | "page";
};

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
      return false; // graduates/legacy roles never reach the dashboard shell
    }),
  })).filter((g) => g.items.length > 0);
}

function nodeText(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function collectDocSearchItems(tree: PageTree.Root): DocSearchItem[] {
  const items: DocSearchItem[] = [];

  function push(item: DocSearchItem) {
    if (!items.some((existing) => existing.href === item.href)) {
      items.push(item);
    }
  }

  function visit(nodes: PageTree.Node[], trail: string[]) {
    for (const node of nodes) {
      if (node.type === "page") {
        const label = nodeText(node.name, "Untitled page");
        const section = trail.join(" / ") || "Documentation";
        push({
          href: node.url,
          label,
          section,
          keywords: `${label} ${section}`.toLowerCase(),
          icon: "page",
        });
        continue;
      }

      if (node.type === "folder") {
        const folderName = nodeText(node.name, "Section");
        const folderLabel = nodeText(node.index?.name, folderName);
        const section = trail.join(" / ") || "Documentation";
        if (node.index) {
          push({
            href: node.index.url,
            label: folderLabel,
            section,
            keywords: `${folderLabel} ${folderName} ${section}`.toLowerCase(),
            icon: "folder",
          });
        }
        visit(node.children, [...trail, folderLabel]);
      }
    }
  }

  visit(tree.children, []);
  return items;
}

function SidebarSearch({ tree }: { tree: PageTree.Root }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const items = collectDocSearchItems(tree);
  const query = q.trim().toLowerCase();
  const matches = query
    ? items.filter((i) => i.keywords.includes(query)).slice(0, 6)
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
              else go("/docs");
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search documentation..."
          aria-label="Search documentation"
          className="w-full rounded-md border border-outline-variant bg-card py-1.5 pr-2 pl-8 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-white/[0.08] dark:bg-surface-low"
        />
      </div>
      {open && query && (
        <div className="absolute right-3 left-3 z-50 mt-1 overflow-hidden rounded-md border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical-md)]">
          <div className="flex items-center justify-between border-outline-variant/60 border-b px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Documentation results
            </span>
            {matches.length > 0 ? (
              <span className="text-[10px] text-on-surface-variant/70">
                {matches.length}
              </span>
            ) : null}
          </div>
          {matches.map((m) => {
            const Icon = m.icon === "folder" ? BookOpen : FileText;
            return (
              <button
                key={m.href}
                type="button"
                onMouseDown={() => go(m.href)}
                className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container"
              >
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-low text-on-surface-variant group-hover:text-accent">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{m.label}</span>
                  <span className="block truncate text-[11px] text-on-surface-variant/70">
                    {m.section}
                  </span>
                </span>
                <ArrowRight className="ml-auto size-3.5 shrink-0 text-on-surface-variant/50 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            );
          })}
          {matches.length === 0 ? (
            <div className="px-3 py-3 text-xs leading-5 text-on-surface-variant">
              No documentation pages match "{q.trim()}". Try "batch",
              "graduation", "LMS", or "settings".
            </div>
          ) : null}
          {matches.length > 0 ? (
            <div className="flex items-center gap-1.5 border-outline-variant/60 border-t px-3 py-2 text-[10px] text-on-surface-variant/70">
              <CornerDownLeft className="size-3" aria-hidden />
              Press Enter to open the first result
            </div>
          ) : null}
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
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
        image={image}
      />
    </>
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
          <StarOfLifeMark className="size-5 shrink-0 text-accent" />
          {open && <span className="truncate">WSL EMS</span>}
        </Link>
      </SidebarHeader>

      {open && role === "admin" && pageTree ? (
        <SidebarSearch tree={pageTree} />
      ) : null}

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
