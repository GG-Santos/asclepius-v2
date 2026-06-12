import { GraduationCap, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { canAuthorPosts } from "@/lib/blog-permission";
import { requireGraduate } from "@/lib/session";

export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await requireGraduate();
  // "My Posts" appears only for graduates an admin granted blog access (R8).
  const showPosts = await canAuthorPosts(session);

  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <header className="border-outline-variant/60 border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/portal"
              className="flex items-center gap-2 font-semibold text-primary"
            >
              <GraduationCap className="size-5 text-accent" aria-hidden />
              <span>Graduate Portal</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/portal"
                className="rounded px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Home
              </Link>
              <Link
                href="/portal/courses"
                className="rounded px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Courses
              </Link>
              <Link
                href="/portal/grades"
                className="rounded px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Grades
              </Link>
              {showPosts && (
                <Link
                  href="/portal/posts"
                  className="rounded px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  My Posts
                </Link>
              )}
              <Link
                href="/portal/settings"
                className="rounded px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-on-surface-variant sm:block">
              {session.user.name}
            </span>
            <Link
              href="/portal/settings"
              title="Account settings"
              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:hidden"
            >
              <SettingsIcon className="size-4" aria-hidden />
              <span className="sr-only">Account settings</span>
            </Link>
            <SignOutButton redirectTo="/portal/login" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
