import { LayoutDashboard, Search } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/session";

function StarOfLifeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Six-arm Star of Life */}
      <rect x="15" y="2" width="10" height="36" rx="3" fill="currentColor" />
      <rect
        x="15"
        y="2"
        width="10"
        height="36"
        rx="3"
        fill="currentColor"
        transform="rotate(60 20 20)"
      />
      <rect
        x="15"
        y="2"
        width="10"
        height="36"
        rx="3"
        fill="currentColor"
        transform="rotate(120 20 20)"
      />
      {/* Medical staff-and-serpent detail */}
      <rect
        x="19"
        y="10"
        width="2"
        height="20"
        rx="1"
        fill="white"
        opacity="0.9"
      />
      <path
        d="M19 14 Q23 17 19 20 Q15 23 19 26"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
}

// Auth-aware public site header — light institutional. Signed-in staff get a
// Dashboard link; the public gets a persistent "Verify a license" action.
export async function PublicHeader({
  verifyHref = "/",
}: {
  verifyHref?: string;
}) {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <StarOfLifeIcon className="size-8 shrink-0 text-primary" />
          <span className="flex flex-col leading-none">
            <span className="text-sm font-extrabold tracking-tight text-primary">
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
            className="hidden text-on-surface-variant transition-colors hover:text-primary sm:inline"
          >
            Verify
          </Link>
          <Link
            href="/#programs"
            className="hidden text-on-surface-variant transition-colors hover:text-primary sm:inline"
          >
            Programs
          </Link>
          <Link
            href="/blog"
            className="hidden text-on-surface-variant transition-colors hover:text-primary sm:inline"
          >
            News
          </Link>
          {session && (
            <Link
              href="/docs"
              className="hidden text-on-surface-variant transition-colors hover:text-primary sm:inline"
            >
              Help
            </Link>
          )}

          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 font-semibold text-on-primary transition-colors hover:bg-accent"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          ) : (
            <Link
              href={verifyHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 font-semibold text-on-primary transition-colors hover:bg-accent"
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
