import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Graduate testimonials",
};

export default async function TestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({
    where: { approved: true },
    orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader verifyHref="/#verify" />
      <main className="flex-1">
        <section className="border-outline-variant border-b bg-surface-container dark:border-white/[0.06] dark:bg-surface">
          <div className="mx-auto w-full max-w-[1000px] px-4 py-12 md:px-8">
            <Link
              href="/#testimonials"
              className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
            >
              <ArrowLeft className="size-4" /> Home
            </Link>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
              Graduate testimonials
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Approved stories from WSL EMS graduates across public cohorts.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1000px] px-4 py-12 md:px-8">
          {testimonials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-card/70 px-6 py-12 text-center text-sm text-on-surface-variant">
              Testimonials are being reviewed.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {testimonials.map((t) => (
                <article
                  key={t.id}
                  className="rounded-xl border border-outline-variant bg-card p-6 shadow-clinical"
                >
                  <div
                    className="flex gap-0.5"
                    role="img"
                    aria-label={`${t.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <svg
                        key={n}
                        viewBox="0 0 16 16"
                        className={`size-3.5 ${n <= t.rating ? "text-amber-500" : "text-outline-variant"}`}
                        fill="currentColor"
                        aria-hidden
                        role="presentation"
                      >
                        <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                    {t.quote}
                  </blockquote>
                  <footer className="mt-5 border-outline-variant border-t pt-4">
                    <p className="font-semibold text-on-surface">{t.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {t.batchCode ? `${t.batchCode} · ` : ""}WSL EMS Graduate
                    </p>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
