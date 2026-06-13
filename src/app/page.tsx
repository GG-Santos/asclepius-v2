import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  Heart,
  Layers,
  type LucideIcon,
  Mail,
  Search,
  ShieldCheck,
  Stethoscope,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import { FadeIn } from "@/components/fade-in";
import { PublicHeader } from "@/components/public-header";
import { DotPattern } from "@/components/ui/dot-pattern";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SparklesText } from "@/components/ui/sparkles-text";
import { VerifySearch } from "@/components/verify-search";
import { normalizeGalleryItems } from "@/lib/batch-gallery";
import { getHomePageContent } from "@/lib/home-content";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Training inquiries go through the /enroll form (persisted as an Inquiry).
const APPLY_HREF = "/enroll";

async function getLandingData() {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  const d60 = new Date(now.getTime() - 60 * 86_400_000);
  const [
    activeGraduates,
    batchList,
    monthlyLookups,
    prevMonthlyLookups,
    posts,
    testimonials,
    team,
    batchesWithLogos,
    homeContent,
  ] = await Promise.all([
    prisma.graduate.count({
      where: {
        status: "GRADUATE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.batch.findMany({ select: { batchNumber: true, code: true } }),
    prisma.lookupEvent.count({ where: { createdAt: { gte: d30 } } }),
    prisma.lookupEvent.count({ where: { createdAt: { gte: d60, lt: d30 } } }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
      },
    }),
    prisma.testimonial.findMany({
      where: { approved: true },
      orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.teamMember.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.batch.findMany({
      where: {
        OR: [{ logoId: { not: null } }, { heroImageUrl: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { logo: true },
    }),
    getHomePageContent(),
  ]);
  const latestBatchNo = batchList.reduce((mx, b) => {
    const m = (b.batchNumber ?? b.code).match(/(\d+)/);
    const n = m ? Number(m[1]) : 0;
    return n > mx ? n : mx;
  }, 0);
  const lookupBoost =
    prevMonthlyLookups > 0
      ? Math.round(
          ((monthlyLookups - prevMonthlyLookups) / prevMonthlyLookups) * 100,
        )
      : monthlyLookups > 0
        ? 100
        : null;
  return {
    activeGraduates,
    latestBatchNo,
    monthlyLookups,
    lookupBoost,
    posts,
    testimonials,
    team,
    batchesWithLogos,
    homeContent,
  };
}

export default async function Home() {
  const {
    activeGraduates,
    latestBatchNo,
    monthlyLookups,
    lookupBoost,
    posts,
    testimonials,
    team,
    batchesWithLogos,
    homeContent,
  } = await getLandingData();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader verifyHref="#verify" />

      <main className="flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-surface">
          <DotPattern className="opacity-[0.22] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
          {/* Dark mode: ambient top-center glow — implies a light source above
              the headline without adding decorative noise. ~4% luminance only. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 55% at 50% -10%, var(--accent-tint-strong) 0%, transparent 65%)",
            }}
          />
          <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
            <FadeIn className="flex flex-col items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-card px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent dark:border-accent/25 dark:bg-accent/[0.06] dark:text-accent-bright dark:shadow-[var(--glow-accent-soft)]">
                <ShieldCheck className="size-3.5" aria-hidden />
                {homeContent.heroEyebrow}
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.07] tracking-tight text-on-surface md:text-6xl">
                {homeContent.heroTitle}{" "}
                <span className="text-primary dark:text-accent-bright">
                  {homeContent.heroAccent}
                </span>
              </h1>

              <p className="mt-4 max-w-md text-lg leading-relaxed text-on-surface-variant">
                {homeContent.heroBody}
              </p>

              <div
                id="verify"
                className="mt-8 w-full max-w-md scroll-mt-24 rounded-2xl border border-outline-variant bg-card p-5 shadow-clinical-md"
              >
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-accent">
                  License lookup
                </p>
                <VerifySearch />
                <p className="mt-3 text-xs text-on-surface-variant">
                  Real-time check against{" "}
                  <span className="font-semibold text-on-surface">
                    {activeGraduates.toLocaleString()}
                  </span>{" "}
                  active credentials · No login required
                </p>
              </div>

              <p className="mt-5 text-sm text-on-surface-variant">
                Looking to train as an EMT?{" "}
                <Link
                  href="#programs"
                  className="font-semibold text-accent transition-colors hover:text-primary dark:hover:text-accent-bright"
                >
                  Explore programs →
                </Link>
              </p>
            </FadeIn>

            <FadeIn delay={120} className="flex justify-center md:justify-end">
              <HeroVisual imageUrl={homeContent.heroImageUrl} />
            </FadeIn>
          </div>
        </section>

        {/* ── PROOF BAR (real data) ────────────────────────────────────── */}
        <section className="border-y border-outline-variant bg-surface-container dark:bg-surface-low dark:border-white/[0.06]">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 md:grid-cols-4 md:divide-x md:divide-outline-variant">
            <StatCell value={activeGraduates} label="Active graduates" />
            <StatCell value={latestBatchNo} label="EMT Batches Trained" />
            <StatCell
              value={monthlyLookups}
              label="Monthly verifications"
              boost={
                lookupBoost != null && lookupBoost > 0
                  ? `+${lookupBoost}%`
                  : undefined
              }
            />
            <StatCell value="ASHI & ECSI" label="Accredited programs" />
          </div>
        </section>

        {/* ── WHAT WSL EMS IS (trust explainer) ────────────────────────── */}
        <section
          id="testimonials"
          className="scroll-mt-24 bg-surface dark:border-t dark:border-white/[0.06]"
        >
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-8">
            <FadeIn className="order-2 md:order-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                {homeContent.aboutEyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-bold leading-snug tracking-tight text-on-surface md:text-4xl">
                {homeContent.aboutTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
                {homeContent.aboutBodyOne}
              </p>
              <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                {homeContent.aboutBodyTwo}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Train", "Evaluate", "License", "Public registry"].map(
                  (step, i) => (
                    <span
                      key={step}
                      className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-card px-3 py-1 text-xs font-medium text-on-surface-variant"
                    >
                      <span className="font-mono text-[10px] text-accent">
                        0{i + 1}
                      </span>
                      {step}
                    </span>
                  ),
                )}
              </div>
            </FadeIn>

            <FadeIn delay={120} className="order-1 md:order-2">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-outline-variant shadow-clinical-md">
                {/* biome-ignore lint/performance/noImgElement: admin-curated CMS image can be external */}
                <img
                  src={homeContent.aboutImageUrl}
                  alt="EMT trainees in a clinical simulation session at WSL EMS"
                  className="h-full w-full object-cover"
                />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── HOW IT WORKS + STATUS HONESTY ────────────────────────────── */}
        <section className="bg-surface-container dark:bg-surface dark:border-t dark:border-white/[0.06]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
            <FadeIn>
              <div className="mx-auto mb-12 max-w-lg text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  How it works
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
                  Confirm a credential in three steps.
                </h2>
                <p className="mt-3 text-base text-on-surface-variant">
                  No account needed. Free and instant for employers, regulators,
                  and the public.
                </p>
              </div>
            </FadeIn>

            <div className="grid gap-5 md:grid-cols-3">
              <FadeIn delay={0}>
                <StepCard
                  number="01"
                  icon={Search}
                  title="Enter the license number"
                  body="Find the License/Control Number (LCN) on the EMT's card or certificate and type it into the search box."
                />
              </FadeIn>
              <FadeIn delay={120}>
                <StepCard
                  number="02"
                  icon={FileCheck}
                  title="Check the live registry"
                  body="We match the number against the official database and return the credential's current status instantly."
                />
              </FadeIn>
              <FadeIn delay={240}>
                <StepCard
                  number="03"
                  icon={ShieldCheck}
                  title="Confirm the credential"
                  body="Review the licensee's profile — name, photo, proficiency record, and certification dates."
                />
              </FadeIn>
            </div>

            <FadeIn delay={200}>
              <div className="mt-8 rounded-2xl border border-outline-variant bg-card p-6 shadow-clinical">
                <p className="text-center text-sm text-on-surface-variant">
                  The registry shows the truth — including when a credential is
                  not valid.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatusItem
                    tone="success"
                    icon={CheckCircle2}
                    label="Verified"
                    desc="Active, current credential."
                  />
                  <StatusItem
                    tone="error"
                    icon={XCircle}
                    label="Expired / Revoked"
                    desc="On file but not currently valid."
                  />
                  <StatusItem
                    tone="muted"
                    icon={AlertCircle}
                    label="Not found"
                    desc="No matching credential in the registry."
                  />
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── PROGRAMS (merged) ────────────────────────────────────────── */}
        <section
          id="programs"
          className="scroll-mt-16 bg-surface dark:border-t dark:border-white/[0.06]"
        >
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
            <FadeIn>
              <div className="mx-auto mb-12 max-w-xl text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  {homeContent.programsEyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
                  {homeContent.programsTitle}
                </h2>
                <p className="mt-3 text-base text-on-surface-variant">
                  {homeContent.programsBody}
                </p>
              </div>
            </FadeIn>

            {homeContent.programImageUrl && (
              <FadeIn delay={80}>
                <div className="mb-8 overflow-hidden rounded-xl border border-outline-variant shadow-clinical-md">
                  {/* biome-ignore lint/performance/noImgElement: admin-curated CMS image can be external */}
                  <img
                    src={homeContent.programImageUrl}
                    alt="WSL EMS program highlight"
                    className="aspect-[16/5] w-full object-cover"
                  />
                </div>
              </FadeIn>
            )}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <FadeIn delay={0}>
                <ProgramCard
                  icon={Heart}
                  tag="BLS"
                  title="ASHI Basic Life Support"
                  hours="8 hours"
                  credential="ASHI Certified"
                  body="CPR, AED, and relief of choking for adult, child, and infant patients. Required for healthcare providers."
                />
              </FadeIn>
              <FadeIn delay={80}>
                <ProgramCard
                  icon={Stethoscope}
                  tag="EMR"
                  title="Emergency Medical Responder"
                  hours="40 hours"
                  credential="ASHI Certified"
                  body="First-on-scene care — assessment, airway management, hemorrhage control, and emergency childbirth."
                />
              </FadeIn>
              <FadeIn delay={160}>
                <ProgramCard
                  icon={Activity}
                  tag="EMT"
                  title="Basic Emergency Medical Technician"
                  hours="160 hours"
                  credential="License-eligible"
                  body="Full prehospital emergency care with licensure eligibility — the foundation of professional EMS practice."
                  featured
                />
              </FadeIn>
              <FadeIn delay={240}>
                <ProgramCard
                  icon={Layers}
                  tag="Advanced"
                  title="Specialized Courses"
                  hours="Varies"
                  credential="Per program"
                  body="Periodic advanced programs — disaster response, tactical EMS, and pediatric emergencies."
                />
              </FadeIn>
            </div>

            <p className="mt-8 text-center text-sm text-on-surface-variant">
              Cohort dates are managed by WSL EMS admissions.
            </p>
            {homeContent.upcomingShow === "true" &&
            homeContent.upcomingProgram ? (
              <div className="mt-8 flex justify-center">
                <UpcomingProgramCard content={homeContent} />
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-on-surface-variant">
                <Link
                  href={APPLY_HREF}
                  className="font-semibold text-accent transition-colors hover:text-primary dark:hover:text-accent-bright"
                >
                  Request the next intake schedule →
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* ── INSTRUCTORS (shell always renders — R8) ──────────────────── */}
        <section className="border-t border-outline-variant bg-surface-container dark:border-white/[0.06] dark:bg-surface">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
            <FadeIn>
              <div className="mx-auto mb-12 max-w-xl text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Who teaches you
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
                  Instructors who have worked the field.
                </h2>
              </div>
            </FadeIn>
            {team.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {team.map((m, i) => (
                  <FadeIn key={m.id} delay={i * 80}>
                    <TeamCard
                      name={m.name}
                      role={m.role}
                      credentials={m.credentials}
                      photoUrl={m.photoUrl}
                    />
                  </FadeIn>
                ))}
              </div>
            ) : (
              <SectionEmpty message="Instructor profiles are being prepared — check back soon." />
            )}
          </div>
        </section>

        {/* ── GRADUATE VOICES (shell always renders — R8) ──────────────── */}
        <section className="bg-surface dark:border-t dark:border-white/[0.06]">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
            <FadeIn>
              <div className="mx-auto mb-12 flex max-w-xl flex-col items-center text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Graduate voices
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
                  What our graduates say.
                </h2>
                <Link
                  href="/testimonials"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-primary dark:hover:text-accent-bright"
                >
                  View all testimonials <ArrowRight className="size-4" />
                </Link>
              </div>
            </FadeIn>
            {testimonials.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-3">
                {testimonials.map((t, i) => (
                  <FadeIn key={t.id} delay={i * 80}>
                    <TestimonialCard
                      name={t.name}
                      batch={t.batchCode}
                      quote={t.quote}
                      rating={t.rating}
                    />
                  </FadeIn>
                ))}
              </div>
            ) : (
              <SectionEmpty message="Graduate stories will appear here as cohorts complete their training." />
            )}
          </div>
        </section>

        {/* ── COHORTS / BATCH WALL (shell always renders — R8) ─────────── */}
        <section
          id="cohorts"
          className="scroll-mt-24 border-t border-outline-variant bg-surface-container dark:border-white/[0.06] dark:bg-surface"
        >
          <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8">
            <FadeIn>
              <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                Cohorts trained at WSL EMS
              </p>
            </FadeIn>
            {batchesWithLogos.length > 0 ? (
              <FadeIn delay={80}>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                  {batchesWithLogos.map((b) => {
                    const gallery = normalizeGalleryItems(
                      b.galleryItems,
                      b.galleryUrls,
                    );
                    const thumb =
                      b.logo?.url ?? b.heroImageUrl ?? gallery[0]?.url;
                    return (
                      <Link
                        key={b.id}
                        href={`/cohorts/${b.id}`}
                        className="group flex flex-col items-center gap-2"
                      >
                        {thumb && (
                          <span className="relative">
                            {/* biome-ignore lint/performance/noImgElement: admin-uploaded media on arbitrary domains */}
                            <img
                              src={thumb}
                              alt={`${b.code} cohort`}
                              className="size-20 rounded-xl border border-outline-variant bg-card object-cover p-1.5 transition-all group-hover:border-accent group-hover:shadow-clinical-md"
                            />
                            {gallery.length > 0 && (
                              <span className="-right-2 -top-2 absolute rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-on-accent shadow-clinical">
                                Gallery
                              </span>
                            )}
                          </span>
                        )}
                        <span className="text-center text-[11px] font-medium text-on-surface-variant group-hover:text-accent">
                          {b.label ?? b.code}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </FadeIn>
            ) : (
              <SectionEmpty message="Cohort crests will appear here as new batches are formed." />
            )}
          </div>
        </section>

        {/* ── NEWS (shell always renders — R8) ─────────────────────────── */}
        <section className="border-t border-outline-variant bg-surface-container dark:border-white/[0.06] dark:bg-surface">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
            <FadeIn>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                    Latest updates
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-on-surface">
                    From the newsroom
                  </h2>
                </div>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-primary dark:hover:text-accent-bright"
                >
                  All posts <ArrowRight className="size-4" />
                </Link>
              </div>
            </FadeIn>

            {posts.length === 0 ? (
              <div className="mt-8">
                <SectionEmpty message="No published updates yet — announcements and articles land here first." />
              </div>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {posts.map((p, i) => (
                  <FadeIn key={p.id} delay={i * 80}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant bg-card shadow-clinical transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-clinical-md"
                    >
                      <div className="flex-1 p-6">
                        <h3 className="font-semibold leading-snug text-on-surface transition-colors group-hover:text-accent">
                          {p.title}
                        </h3>
                        {p.excerpt && (
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
                            {p.excerpt}
                          </p>
                        )}
                      </div>
                      {p.publishedAt && (
                        <div className="border-t border-outline-variant px-6 py-3">
                          <time className="text-xs text-on-surface-variant">
                            {p.publishedAt.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                      )}
                    </Link>
                  </FadeIn>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── FINAL CTA (dual) — stable-dark zone: ink in light, deep-teal
            gradient in dark; text stays light in both modes. ─────────────── */}
        <section className="relative overflow-hidden bg-primary text-on-primary dark:text-white dark:border-t dark:border-white/[0.06]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{
              background: "var(--gradient-deep)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 70% 80% at 50% 120%, var(--accent-tint-strong) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 py-20 text-center md:px-8">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="size-7" aria-hidden />
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
              {homeContent.finalCtaTitle}
            </h2>
            <p className="mt-3 max-w-lg text-base text-white/70">
              {homeContent.finalCtaBody}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#verify"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-7 text-sm font-bold text-black transition-colors hover:bg-accent-bright hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Search className="size-4" aria-hidden />
                Verify a license
              </Link>
              <Link
                href={APPLY_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-7 text-sm font-bold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Mail className="size-4" aria-hidden />
                Apply for training
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-outline-variant bg-surface dark:border-white/[0.06] dark:bg-sidebar">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <p className="font-extrabold tracking-tight text-primary">
                WSL EMS
              </p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                We Save Lives
              </p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                WSL EMS Safety &amp; Rescue Training Center — EMS training and
                the official public registry of its certified Emergency Medical
                Technicians.
              </p>
              <p className="mt-3 text-sm text-on-surface-variant">
                Admissions:{" "}
                <Link
                  href={APPLY_HREF}
                  className="font-medium text-accent transition-colors hover:text-primary dark:hover:text-accent-bright"
                >
                  Apply online →
                </Link>
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                href="#verify"
                className="text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright"
              >
                Verify
              </Link>
              <Link
                href="#programs"
                className="text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright"
              >
                Programs
              </Link>
              <Link
                href="/blog"
                className="text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright"
              >
                News
              </Link>
              <Link
                href="/docs"
                className="text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright"
              >
                Help
              </Link>
              <CookiePreferencesLink className="text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright" />
              <Link
                href="/login"
                className="text-on-surface-variant transition-colors hover:text-primary dark:hover:text-accent-bright"
              >
                Staff sign in
              </Link>
            </nav>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-outline-variant pt-6 text-xs text-on-surface-variant md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} WSL EMS Safety &amp; Rescue Training
              Center · All rights reserved
            </p>
            <p>
              ASHI-accredited programs · Public verification is free and
              anonymous
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({
  value,
  label,
  boost,
}: {
  value: string | number;
  label: string;
  boost?: string;
}) {
  return (
    <div className="px-6 py-8 text-center">
      <p className="tabular text-3xl font-extrabold tracking-tight text-primary dark:text-accent-bright md:text-4xl">
        {typeof value === "number" ? <NumberTicker value={value} /> : value}
        {boost && (
          <span className="ml-2 inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 align-middle text-xs font-bold text-success">
            ↑ {boost}
          </span>
        )}
      </p>
      <p className="mt-1.5 text-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

function HeroVisual({ imageUrl }: { imageUrl: string }) {
  if (!imageUrl) return <VerifiedSampleCard />;
  return (
    <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant shadow-clinical-md">
      {/* biome-ignore lint/performance/noImgElement: admin-curated CMS image can be external */}
      <img
        src={imageUrl}
        alt="WSL EMS training and credentialing"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function UpcomingProgramCard({
  content,
}: {
  content: {
    upcomingProgram: string;
    upcomingStartAt: string;
    upcomingStatus: string;
    upcomingCapacity: string;
    upcomingCtaUrl: string;
  };
}) {
  const href = content.upcomingCtaUrl || APPLY_HREF;
  const date = content.upcomingStartAt
    ? new Date(content.upcomingStartAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Date to be announced";
  const capacity = content.upcomingCapacity
    ? Number.parseInt(content.upcomingCapacity, 10)
    : null;
  const status = content.upcomingStatus
    ? content.upcomingStatus.toLowerCase()
    : "announced";

  return (
    <Link
      href={href}
      className="group flex w-full max-w-md items-center gap-4 rounded-xl border border-outline-variant bg-card p-4 text-left shadow-clinical transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-clinical-md"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-lg font-bold text-accent">
        {content.upcomingProgram.slice(0, 3).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-widest text-accent">
          {content.upcomingProgram}
        </span>
        <span className="mt-1 block text-sm text-on-surface-variant">
          {date}
          {capacity ? ` · ${capacity} seats` : ""}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold capitalize text-on-surface-variant">
        {status}
      </span>
    </Link>
  );
}

function VerifiedSampleCard() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-card p-5 shadow-clinical-md">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-success">
          <BadgeCheck className="size-3.5" aria-hidden />
          Verified
        </span>
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
          Sample
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary dark:bg-accent/[0.1] dark:text-accent">
          JC
        </div>
        <div>
          <p className="font-semibold text-on-surface">Juan D. Cruz</p>
          <p className="font-mono text-xs text-on-surface-variant">
            LCN A09-240801
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-outline-variant pt-4 text-sm">
        <div>
          <dt className="text-xs text-on-surface-variant">Credential</dt>
          <dd className="font-medium text-on-surface">Basic EMT</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">Cohort</dt>
          <dd className="font-medium text-on-surface">Batch 19</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">Issued</dt>
          <dd className="font-mono text-on-surface">2024-08</dd>
        </div>
        <div>
          <dt className="text-xs text-on-surface-variant">Status</dt>
          <dd className="font-medium text-success">Active</dd>
        </div>
      </dl>
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  body,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-outline-variant bg-card p-6 shadow-clinical">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-1 -top-2 select-none font-mono text-6xl font-black leading-none text-on-surface/[0.04]"
      >
        {number}
      </span>
      <div className="relative">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent dark:bg-accent/[0.08] dark:ring-1 dark:ring-accent/[0.15]">
          <Icon className="size-5" aria-hidden />
        </div>
        <h3 className="mt-4 font-semibold text-on-surface">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          {body}
        </p>
      </div>
    </div>
  );
}

function StatusItem({
  tone,
  icon: Icon,
  label,
  desc,
}: {
  tone: "success" | "error" | "muted";
  icon: LucideIcon;
  label: string;
  desc: string;
}) {
  const toneMap = {
    success: "bg-success/10 text-success",
    error: "bg-secondary/10 text-secondary",
    muted: "bg-surface-container text-on-surface-variant",
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface p-4">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${toneMap[tone]}`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant">{desc}</p>
      </div>
    </div>
  );
}

function ProgramCard({
  icon: Icon,
  tag,
  title,
  hours,
  credential,
  body,
  featured = false,
}: {
  icon: LucideIcon;
  tag: string;
  title: string;
  hours: string;
  credential: string;
  body: string;
  /** The flagship program — accent ring, badge, and a solid CTA. */
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "relative flex h-full flex-col rounded-2xl border border-accent/60 bg-card p-6 shadow-clinical-md ring-2 ring-accent/30 transition-all duration-200 hover:-translate-y-0.5 dark:bg-accent/[0.04]"
          : "flex h-full flex-col rounded-2xl border border-outline-variant bg-card p-6 shadow-clinical transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-clinical-md"
      }
    >
      {featured && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-accent shadow-clinical">
          <Activity className="size-3" aria-hidden />
          Flagship course
        </span>
      )}
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-accent/[0.08] dark:text-accent dark:ring-1 dark:ring-accent/[0.15]">
        <Icon className="size-5" aria-hidden />
      </div>
      <span
        className={
          featured
            ? "mt-4 inline-flex w-fit items-center rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent"
            : "mt-4 inline-flex w-fit items-center rounded-full border border-outline-variant bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
        }
      >
        {featured ? <SparklesText>{tag}</SparklesText> : tag}
      </span>
      <h3 className="mt-3 font-semibold leading-snug text-on-surface">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">
        {body}
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-on-surface-variant">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        <span className={featured ? "font-semibold text-on-surface" : ""}>
          {hours} · {credential}
        </span>
      </div>
      <Link
        href={APPLY_HREF}
        className={
          featured
            ? "mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:bg-accent dark:text-on-accent dark:hover:bg-accent-bright"
            : "mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-accent/25 dark:bg-accent/[0.06] dark:text-accent dark:hover:bg-accent dark:hover:text-white"
        }
      >
        <Mail className="size-4" aria-hidden />
        Apply / Request info
      </Link>
    </div>
  );
}

function TestimonialCard({
  name,
  batch,
  quote,
  rating,
}: {
  name: string;
  batch: string | null;
  quote: string;
  rating: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-full flex-col rounded-2xl border border-outline-variant bg-card p-6 shadow-clinical">
      <div
        className="flex gap-0.5"
        role="img"
        aria-label={`${rating} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            viewBox="0 0 16 16"
            className={`size-3.5 ${n <= rating ? "text-amber-500" : "text-outline-variant"}`}
            fill="currentColor"
            aria-hidden
            role="presentation"
          >
            <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z" />
          </svg>
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-on-surface-variant">
        {quote}
      </blockquote>
      <div className="mt-5 flex items-center gap-3 border-t border-outline-variant pt-4">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-accent/[0.1] dark:text-accent">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-on-surface">{name}</p>
          <p className="text-[11px] text-on-surface-variant">
            {batch ? `${batch} · ` : ""}WSL EMS Graduate
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamCard({
  name,
  role,
  credentials,
  photoUrl,
}: {
  name: string;
  role: string;
  credentials: string | null;
  photoUrl: string | null;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex flex-col items-center rounded-2xl border border-outline-variant bg-card p-6 text-center shadow-clinical">
      {photoUrl ? (
        // biome-ignore lint/performance/noImgElement: admin-provided external photo URL on an arbitrary domain
        <img
          src={photoUrl}
          alt={name}
          className="size-20 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary dark:bg-accent/[0.1] dark:text-accent">
          {initials}
        </div>
      )}
      <p className="mt-4 font-semibold text-on-surface">{name}</p>
      <p className="text-sm text-accent">{role}</p>
      {credentials && (
        <p className="mt-1 text-xs text-on-surface-variant">{credentials}</p>
      )}
    </div>
  );
}

/** Designed empty placeholder for always-rendered homepage sections (R8). */
function SectionEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant bg-card/50 px-6 py-12 text-center text-sm text-on-surface-variant dark:border-white/[0.1] dark:bg-white/[0.02]">
      {message}
    </div>
  );
}
