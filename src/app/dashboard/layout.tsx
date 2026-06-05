import { cookies } from "next/headers";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardPageTitle } from "@/components/dashboard/page-title";
import { DashboardMobileNav } from "@/components/dashboard/sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireUser } from "@/lib/session";
import { source } from "@/lib/source";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const { name, email, role } = session.user;

  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        role={role}
        name={name}
        email={email}
        pageTree={source.pageTree}
      />
      <SidebarInset>
        <header className="flex h-16 items-center justify-between gap-3 border-b border-outline-variant/60 bg-card px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="hidden md:flex" />
            <span className="font-semibold text-primary md:hidden">
              WSL EMS
            </span>
            <span className="hidden md:block">
              <DashboardPageTitle />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AnimatedThemeToggler />
            <div className="md:hidden">
              <SignOutButton />
            </div>
          </div>
        </header>
        <DashboardMobileNav role={role} />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
