import { cookies } from "next/headers";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AutoArchiveExpired } from "@/components/dashboard/auto-archive";
import { DashboardPageTitle } from "@/components/dashboard/page-title";
import { DashboardMobileNav } from "@/components/dashboard/sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";
import { source } from "@/lib/source";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Graduates are redirected to /portal inside requireStaff; legacy roles
  // (e.g. removed "writer") land here with pending=true and see only the
  // reassignment notice — no nav, no data.
  const { session, pending } = await requireStaff();
  const { name, email, role, image } = session.user;

  if (pending) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <h1 className="text-lg font-semibold text-on-surface">
          Account pending reassignment
        </h1>
        <p className="max-w-md text-sm text-on-surface-variant">
          Your account type ({role}) is no longer in use. An administrator needs
          to reassign your account before you can continue. Contact the training
          center.
        </p>
        <SignOutButton />
      </div>
    );
  }

  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  // Batches a professor has asked an admin to graduate (badge in the nav).
  const pendingReviews =
    role === "admin"
      ? await prisma.batch.count({
          where: { graduationRequested: true, graduated: false },
        })
      : 0;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        role={role}
        name={name}
        email={email}
        image={image ?? null}
        pageTree={source.pageTree}
        pendingReviews={pendingReviews}
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
        {role === "admin" && <AutoArchiveExpired />}
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
