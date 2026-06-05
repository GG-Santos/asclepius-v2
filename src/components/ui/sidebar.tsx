"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type SidebarContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

function writeCookie(value: boolean) {
  // biome-ignore lint/suspicious/noDocumentCookie: standard browser API for SSR-readable cookie
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}`;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) {
  const [open, setOpenRaw] = React.useState(defaultOpen);

  const setOpen = React.useCallback((value: boolean) => {
    writeCookie(value);
    setOpenRaw(value);
  }, []);

  const toggle = React.useCallback(() => {
    setOpenRaw((prev) => {
      const next = !prev;
      writeCookie(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle }}>
      <div className={cn("flex min-h-svh", className)} {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col overflow-hidden md:flex",
        "bg-primary text-on-primary",
        "transition-[width] duration-300 ease-in-out",
        open ? "w-64" : "w-12",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarTrigger({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent",
        className,
      )}
      {...props}
    >
      {/* PanelLeft icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
      <span className="sr-only">Toggle sidebar (Ctrl+B)</span>
    </button>
  );
}

export function SidebarInset({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex h-16 items-center overflow-hidden", className)}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t border-on-primary/10", className)}
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1", className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebar();
  if (!open) return null;
  return (
    <div
      className={cn(
        "mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-on-primary-container/50",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("", className)} {...props} />;
}
