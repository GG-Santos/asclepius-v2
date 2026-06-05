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
  LayoutDashboard,
  Library,
  LogOut,
  Quote,
  ShieldCheck,
  ShieldUser,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
};

type NavGroup = { label?: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
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
  const { open } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-on-primary/10 focus:outline-none",
          !open && "justify-center",
        )}
      >
        <Avatar
          name={name}
          className="shrink-0 bg-on-primary/15 text-on-primary"
        />
        {open && (
          <div className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-sm font-medium text-on-primary">
              {name}
            </span>
            <span className="truncate text-xs text-on-primary-container/70">
              {email}
            </span>
          </div>
        )}
        {open && (
          <ChevronsUpDown className="size-4 shrink-0 text-on-primary-container/70" />
        )}
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

export function AppSidebar({
  role,
  name,
  email,
  pageTree,
}: {
  role: Role;
  name: string;
  email: string;
  pageTree?: PageTree.Root;
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
          <ShieldCheck
            className="size-5 shrink-0 text-accent-bright"
            aria-hidden
          />
          {open && <span className="truncate">WSL EMS</span>}
        </Link>
      </SidebarHeader>

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
                          open ? "gap-3 px-3" : "justify-center px-0",
                          active
                            ? "bg-on-primary/15 text-on-primary"
                            : "text-on-primary-container hover:bg-on-primary/10 hover:text-on-primary",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {open && (
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {item.label}
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
        <NavUser name={name} email={email} role={role} />
      </SidebarFooter>
    </Sidebar>
  );
}
