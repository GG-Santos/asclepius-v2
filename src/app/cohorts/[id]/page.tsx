import { ArrowLeft, GraduationCap, Images, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CohortGallery } from "@/components/cohort-gallery";
import { PublicHeader } from "@/components/public-header";
import { normalizeGalleryItems } from "@/lib/batch-gallery";
import {
  displayName,
  type VerificationState,
  verificationState,
} from "@/lib/graduate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATE_BADGE: Record<VerificationState, { label: string; cls: string }> = {
  verified: { label: "Verified", cls: "bg-success/10 text-success" },
  expired: { label: "Expired", cls: "bg-secondary/10 text-secondary" },
  archived: {
    label: "Archived",
    cls: "bg-surface-container text-on-surface-variant",
  },
};

export default async function CohortPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      logo: { select: { url: true } },
      graduates: {
        where: { status: { in: ["GRADUATE", "ARCHIVED"] } },
        orderBy: [{ status: "asc" }, { lcn: "asc" }],
        select: {
          id: true,
          lcn: true,
          name: true,
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!batch) notFound();

  const title = batch.batchNumber ? `Batch ${batch.batchNumber}` : batch.code;
  // Tolerate a stale Prisma client (fields added recently; dev server may not
  // have reloaded) and legacy documents without the media fields.
  const heroImageUrl = batch.heroImageUrl ?? null;
  const galleryItems = normalizeGalleryItems(
    batch.galleryItems,
    batch.galleryUrls ?? [],
  );
  const grads = batch.graduates.map((g) => ({
    id: g.id,
    lcn: g.lcn,
    name: displayName(g),
    state: verificationState(g),
  }));
  const activeCount = grads.filter((g) => g.state === "verified").length;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader verifyHref="/#verify" />

      <main className="flex-1">
        <section className="border-outline-variant border-b bg-surface-container dark:border-white/[0.06] dark:bg-surface">
          <div className="mx-auto w-full max-w-[1000px] px-4 py-12 md:px-8">
            <Link
              href="/#cohorts"
              className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
            >
              <ArrowLeft className="size-4" /> All cohorts
            </Link>

            <div className="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              {batch.logo?.url ? (
                // biome-ignore lint/performance/noImgElement: admin-uploaded blob logo on an arbitrary domain
                <img
                  src={batch.logo.url}
                  alt={`${title} logo`}
                  className="size-24 shrink-0 rounded-2xl border border-outline-variant bg-card object-contain p-3"
                />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-outline-variant bg-card">
                  <GraduationCap className="size-10 text-on-surface-variant/40" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
                  {batch.label ?? title}
                </h1>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {batch.label ? `${title} · ` : ""}
                  {batch.professor
                    ? `Instructor: ${batch.professor}`
                    : "WSL EMS"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 font-medium text-on-surface-variant ring-1 ring-outline-variant">
                    <GraduationCap className="size-3.5" /> {grads.length}{" "}
                    graduates
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                    <ShieldCheck className="size-3.5" /> {activeCount} active
                  </span>
                </div>
              </div>
            </div>

            {batch.description && (
              <p className="mt-6 text-justify text-sm leading-relaxed text-on-surface-variant">
                {batch.description}
              </p>
            )}
          </div>
        </section>

        {heroImageUrl && (
          <section className="bg-surface">
            <div className="mx-auto w-full max-w-[1000px] px-4 py-12 md:px-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-label-caps text-accent">Cohort portrait</p>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Official batch group photo
                </p>
              </div>
              {/* biome-ignore lint/performance/noImgElement: admin-curated media on arbitrary domains */}
              <img
                src={heroImageUrl}
                alt={`${batch.label ?? title} batch group portrait`}
                className="aspect-video w-full rounded-lg border border-outline-variant/60 object-cover shadow-[var(--shadow-clinical-md)] dark:border-white/[0.08]"
              />
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-[1000px] px-4 py-12 md:px-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
            Graduates
          </h2>
          {grads.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No graduates listed for this cohort yet.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {grads.map((g) => {
                const badge = STATE_BADGE[g.state];
                return (
                  <li key={g.id}>
                    <Link
                      href={`/verify/${g.lcn}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-card px-4 py-3 transition-colors hover:border-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium uppercase text-on-surface">
                          {g.name}
                        </span>
                        <span className="tabular text-xs text-on-surface-variant">
                          {g.lcn}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {galleryItems.length > 0 && (
          <section className="overflow-hidden border-y border-outline-variant bg-surface-container dark:border-white/[0.06] dark:bg-surface">
            <div className="mx-auto w-full max-w-[1000px] px-4 pt-12 md:px-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-label-caps text-accent">
                    <Images className="size-4" aria-hidden />
                    Batch gallery
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-on-surface">
                    Training moments
                  </h2>
                </div>
                <p className="text-sm text-on-surface-variant">
                  {galleryItems.length}{" "}
                  {galleryItems.length === 1 ? "photo" : "photos"} in this batch
                  record
                </p>
              </div>
            </div>
            <div className="w-full px-4 pb-12 md:px-8 lg:px-12">
              <CohortGallery
                items={galleryItems}
                cohortName={batch.label ?? title}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
