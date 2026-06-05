import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/session";
import { source } from "@/lib/source";

export default async function DocsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Docs are internal staff material — not publicly accessible (admin only).
  const session = await requireAdmin();
  const { role, name, email } = session.user;

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Render docs inside the same app-sidebar shell as the dashboard. The docs
  // tree lives in AppSidebar (NavDocs), so Fumadocs' own sidebar + nav are off.
  return (
    <RootProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar
          role={role}
          name={name}
          email={email}
          pageTree={source.pageTree}
        />
        <SidebarInset>
          <header className="flex h-16 items-center gap-2 border-b border-outline-variant/60 bg-card px-4 md:px-6">
            <SidebarTrigger />
            <span className="font-semibold text-on-surface">Documentation</span>
          </header>
          <DocsLayout
            tree={source.pageTree}
            sidebar={{ enabled: false }}
            nav={{ enabled: false }}
          >
            {children}
          </DocsLayout>
        </SidebarInset>
      </SidebarProvider>
    </RootProvider>
  );
}
