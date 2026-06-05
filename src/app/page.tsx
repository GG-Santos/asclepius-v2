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
import Image from "next/image";
import Link from "next/link";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import { FadeIn } from "@/components/fade-in";
import { PublicHeader } from "@/components/public-header";
import { VerifySearch } from "@/components/verify-search";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Training inquiries go through the /enroll form (persisted as an Inquiry).
const APPLY_HREF = "/enroll";

async function getLandingData() {
  const [
    licensed,
    batches,
    lookups,
    posts,
    testimonials,
    team,
    batchesWithLogos,
  ] = await Promise.all([
    prisma.graduate.count({ where: { status: "GRADUATE" } }),
    prisma.batch.count(),
    prisma.lookupEvent.count(),
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
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.teamMember.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.batch.findMany({
      where: { logoId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { logo: true },
    }),
  ]);
  return {
    licensed,
    batches,
    lookups,
    posts,
    testimonials,
    team,
    batchesWithLogos,
  };
}

export default async function Home() {
  const {
    licensed,
    batches,
    lookups,
    posts,
    testimonials,
    team,
    batchesWithLogos,
  } = await getLandingData();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader verifyHref="#verify" />

      <main className="flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="bg-surface">
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
            <FadeIn className="flex flex-col items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-card px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
                <ShieldCheck className="size-3.5" aria-hidden />
                Official EMT Credential Registry
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.07] tracking-tight text-on-surface md:text-6xl">
                Verify an EMT&apos;s license{" "}
                <span className="text-primary">in seconds.</span>
              </h1>

              <p className="mt-4 max-w-md text-lg leading-relaxed text-on-surface-variant">
                The official registry of Emergency Medical Technicians trained
                and certified at WSL EMS.
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
                    {licensed.toLocaleString()}
                  </span>{" "}
                  active credentials · No login required
                </p>
              </div>

              <p className="mt-5 text-sm text-on-surface-variant">
                Looking to train as an EMT?{" "}
                <Link
                  href="#programs"
                  className="font-semibold text-accent transition-colors hover:text-primary"
                >
                  Explore programs →
                </Link>
              </p>
            </FadeIn>

            <FadeIn delay={120} className="flex justify-center md:justify-end">
              <VerifiedSampleCard />
            </FadeIn>
          </div>
        </section>

        {/* ── PROOF BAR (real data) ────────────────────────────────────── */}
        <section className="border-y border-outline-variant bg-surface-container">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 md:grid-cols-4 md:divide-x md:divide-outline-variant">
            <StatCell
              value={licensed.toLocaleString()}
              label="Licensed technicians"
            />
            <StatCell
              value={batches.toLocaleString()}
              label="Cohorts trained"
            />
            <StatCell
              value={lookups.toLocaleString()}
              label="Credential checks run"
            />
            <StatCell value="ASHI" label="Accredited programs" />
          </div>
        </section>

        {/* ── WHAT WSL EMS IS (trust explainer) ────────────────────────── */}
        <section className="bg-surface">
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-8">
            <FadeIn className="order-2 md:order-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                What WSL EMS is
              </p>
              <h2 className="mt-2 text-3xl font-bold leading-snug tracking-tight text-on-surface md:text-4xl">
                A training center — and the public record of its graduates.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
                WSL EMS trains and certifies Emergency Medical Technicians. This
                registry is the public record of everyone we&apos;ve certified,
                so employers, agencies, and patients can confirm that a
                responder holds a real, current credential.
              </p>
              <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                Every technician completes written examinations, practical
                skills evaluations, and supervised clinical training before a
                license is issued.
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
                <Image
                  src="/assets/img/generated/about-team.webp"
                  alt="EMT trainees in a clinical simulation session at WSL EMS"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 540px"
                />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── HOW IT WORKS + STATUS HONESTY ────────────────────────────── */}
        <section className="bg-surface-container">
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
        <section id="programs" className="scroll-mt-16 bg-surface">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
            <FadeIn>
              <div className="mx-auto mb-12 max-w-xl text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Programs &amp; training
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
                  ASHI-accredited EMS training, built for real emergencies.
                </h2>
                <p className="mt-3 text-base text-on-surface-variant">
                  Every program is accredited by the American Safety &amp;
                  Health Institute and evaluated by written exam, practical
                  skills, and supervised clinical hours.
                </p>
              </div>
            </FadeIn>

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
                  hours="130+ hours"
                  credential="License-eligible"
                  body="Full prehospital emergency care with licensure eligibility — the foundation of professional EMS practice."
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
              Cohort dates are managed by WSL EMS admissions.{" "}
              <Link
                href={APPLY_HREF}
                className="font-semibold text-accent transition-colors hover:text-primary"
              >
                Request the next intake schedule →
              </Link>
            </p>
          </div>
        </section>

        {/* ── INSTRUCTORS (gated on published team) ────────────────────── */}
        {team.length > 0 && (
          <section className="border-t border-outline-variant bg-surface-container">
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
            </div>
          </section>
        )}

        {/* ── GRADUATE VOICES (gated on approved testimonials) ─────────── */}
        {testimonials.length > 0 && (
          <section className="bg-surface">
            <div className="mx-auto w-full max-w-[1200px] px-4 py-20 md:px-8">
              <FadeIn>
                <div className="mx-auto mb-12 max-w-xl text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                    Graduate voices
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
                    What our graduates say.
                  </h2>
                </div>
              </FadeIn>
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
            </div>
          </section>
        )}

        {/* ── COHORTS / BATCH WALL (gated on batches with logos) ───────── */}
        {batchesWithLogos.length > 0 && (
          <section className="border-t border-outline-variant bg-surface-container">
            <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8">
              <FadeIn>
                <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Cohorts trained at WSL EMS
                </p>
              </FadeIn>
              <FadeIn delay={80}>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                  {batchesWithLogos.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-col items-center gap-2"
                    >
                      {b.logo?.url && (
                        // biome-ignore lint/performance/noImgElement: admin-uploaded blob logo on an arbitrary domain
                        <img
                          src={b.logo.url}
                          alt={`${b.code} cohort logo`}
                          className="size-20 rounded-xl border border-outline-variant bg-card object-contain p-2"
                        />
                      )}
                      <span className="text-[11px] font-medium text-on-surface-variant">
                        {b.label ?? b.code}
                      </span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </section>
        )}

        {/* ── NEWS (gated on real posts) ───────────────────────────────── */}
        {posts.length > 0 && (
          <section className="border-t border-outline-variant bg-surface-container">
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
                    className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-primary"
                  >
                    All posts <ArrowRight className="size-4" />
                  </Link>
                </div>
              </FadeIn>

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
            </div>
          </section>
        )}

        {/* ── FINAL CTA (dual) ─────────────────────────────────────────── */}
        <section className="bg-primary text-on-primary">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 py-20 text-center md:px-8">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="size-7" aria-hidden />
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
              Confirm a credential — or start your own.
            </h2>
            <p className="mt-3 max-w-lg text-base text-white/70">
              Verification is free, instant, and open to anyone. Training
              enrollment is one message away.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#verify"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-7 text-sm font-bold text-primary transition-colors hover:bg-accent-bright hover:text-on-primary"
              >
                <Search className="size-4" aria-hidden />
                Verify a license
              </Link>
              <Link
                href={APPLY_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-7 text-sm font-bold text-on-primary transition-colors hover:bg-white/10"
              >
                <Mail className="size-4" aria-hidden />
                Apply for training
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-outline-variant bg-surface">
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
                  className="font-medium text-accent transition-colors hover:text-primary"
                >
                  Apply online →
                </Link>
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                href="#verify"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                Verify
              </Link>
              <Link
                href="#programs"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                Programs
              </Link>
              <Link
                href="/blog"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                News
              </Link>
              <Link
                href="/docs"
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                Help
              </Link>
              <CookiePreferencesLink className="text-on-surface-variant transition-colors hover:text-primary" />
              <Link
                href="/login"
                className="text-on-surface-variant transition-colors hover:text-primary"
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

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-6 py-8 text-center">
      <p className="tabular text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
        {value}
      </p>
      <p className="mt-1.5 text-sm text-on-surface-variant">{label}</p>
    </div>
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
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
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
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
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
}: {
  icon: LucideIcon;
  tag: string;
  title: string;
  hours: string;
  credential: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-outline-variant bg-card p-6 shadow-clinical transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-clinical-md">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <span className="mt-4 inline-flex w-fit items-center rounded-full border border-outline-variant bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {tag}
      </span>
      <h3 className="mt-3 font-semibold leading-snug text-on-surface">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">
        {body}
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-on-surface-variant">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        {hours} · {credential}
      </div>
      <Link
        href={APPLY_HREF}
        className="mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary"
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
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
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
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
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
