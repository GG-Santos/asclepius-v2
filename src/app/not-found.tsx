import { ArrowRight, GraduationCap, Search } from "lucide-react";
import Link from "next/link";
import { StarOfLifeMark } from "@/components/brand/star-of-life-mark";
import { PublicHeader } from "@/components/public-header";
import { VerifySearch } from "@/components/verify-search";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader verifyHref="/#verify" />
      <main className="flex flex-1 items-center">
        <section className="mx-auto grid w-full max-w-[1100px] gap-10 px-4 py-16 md:grid-cols-[1fr_24rem] md:px-8">
          <div>
            <StarOfLifeMark className="size-12 text-accent" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-accent">
              Page not found
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
              This route is not in the registry.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant">
              Search for a credential, return to the public registry, or start a
              training inquiry with WSL EMS.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Search className="size-4" aria-hidden />
                Back to verification
              </Link>
              <Link
                href="/enroll"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-card px-5 text-sm font-semibold text-on-surface hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <GraduationCap className="size-4" aria-hidden />
                Training inquiry <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-card p-5 shadow-clinical-md">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-accent">
              License lookup
            </p>
            <VerifySearch />
            <p className="mt-3 text-xs text-on-surface-variant">
              Use the License/Control Number printed on the card or certificate.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
