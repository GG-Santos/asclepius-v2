import { LayoutDashboard, Search } from "lucide-react";
import Link from "next/link";
import { StarOfLifeMark } from "@/components/brand/star-of-life-mark";
import { getSession } from "@/lib/session";

// Auth-aware public site header — light institutional. Signed-in staff get a
// Dashboard link; the public gets a persistent "Verify a license" action.
export async function PublicHeader({
  verifyHref = "/",
}: {
  verifyHref?: string;
}) {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <StarOfLifeMark className="size-8 shrink-0" />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-extrabold tracking-tight text-primary dark:text-accent-bright">
              WSL EMS
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
              We Save Lives
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm sm:gap-7">
          <Link
            href={verifyHref}
            className="hidden text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright sm:inline"
          >
            Verify
          </Link>
          <Link
            href="/#programs"
            className="hidden text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright sm:inline"
          >
            Programs
          </Link>
          <Link
            href="/blog"
            className="hidden text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright sm:inline"
          >
            News
          </Link>
          {isAdmin && (
            <Link
              href="/docs"
              className="hidden text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright sm:inline"
            >
              Admin wiki
            </Link>
          )}

          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 font-semibold text-on-primary transition-colors hover:bg-accent dark:bg-accent dark:text-white dark:hover:bg-accent-bright"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          ) : (
            <Link
              href={verifyHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 font-semibold text-on-primary transition-colors hover:bg-accent dark:bg-accent dark:text-white dark:hover:bg-accent-bright"
            >
              <Search className="size-4" aria-hidden />
              <span className="hidden sm:inline">Verify a license</span>
              <span className="sm:hidden">Verify</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
