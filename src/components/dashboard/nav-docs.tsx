"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { ChevronRight, FileText, Folder } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// Renders the Fumadocs docs page tree as a collapsible "Documentation" section
// inside the app sidebar — the docs nav lives in the same shell as the
// dashboard nav.
function linkClass(active: boolean) {
  return cn(
    "flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
    active
      ? "bg-on-primary/15 font-medium text-on-primary"
      : "text-on-primary-container hover:bg-on-primary/10 hover:text-on-primary",
  );
}

function containsActive(nodes: PageTree.Node[], pathname: string): boolean {
  return nodes.some((n) => {
    if (n.type === "page") return n.url === pathname;
    if (n.type === "folder") {
      return n.index?.url === pathname || containsActive(n.children, pathname);
    }
    return false;
  });
}

function FolderItem({
  node,
  pathname,
}: {
  node: PageTree.Folder;
  pathname: string;
}) {
  const idx = node.index;
  const active = idx ? pathname === idx.url : false;
  const hasChildren = node.children.length > 0;
  // Start expanded only for the section you're currently in.
  const [open, setOpen] = useState(
    () => active || containsActive(node.children, pathname),
  );

  return (
    <li>
      <div className="flex items-center gap-1">
        {idx ? (
          <Link href={idx.url} className={linkClass(active)}>
            <Folder className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{idx.name ?? node.name}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(linkClass(false), "text-left")}
          >
            <Folder className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{node.name}</span>
          </button>
        )}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse section" : "Expand section"}
            aria-expanded={open}
            className="shrink-0 rounded-md p-1 text-on-primary-container transition-colors hover:bg-on-primary/10 hover:text-on-primary"
          >
            <ChevronRight
              className={cn("size-4 transition-transform", open && "rotate-90")}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
      {open && hasChildren ? (
        <ul className="ms-4 mt-1 space-y-1 border-s border-on-primary/15 ps-2">
          {renderNodes(node.children, pathname)}
        </ul>
      ) : null}
    </li>
  );
}

function renderNodes(nodes: PageTree.Node[], pathname: string): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === "separator") {
      return (
        <li
          key={node.$id ?? `sep-${i}`}
          className="mt-3 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-on-primary-container/60 first:mt-0"
        >
          {node.name}
        </li>
      );
    }

    if (node.type === "folder") {
      return (
        <FolderItem
          key={node.$id ?? `folder-${i}`}
          node={node}
          pathname={pathname}
        />
      );
    }

    return (
      <li key={node.$id ?? `page-${i}`}>
        <Link href={node.url} className={linkClass(pathname === node.url)}>
          <FileText className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{node.name}</span>
        </Link>
      </li>
    );
  });
}

export function NavDocs({ tree }: { tree: PageTree.Root }) {
  const pathname = usePathname();
  const { open } = useSidebar();
  // The tree is too detailed for the collapsed icon rail — hide it there.
  if (!open) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Documentation</SidebarGroupLabel>
      <ul className="space-y-1">{renderNodes(tree.children, pathname)}</ul>
    </SidebarGroup>
  );
}
