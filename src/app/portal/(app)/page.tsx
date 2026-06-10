import { ArrowRight, BookOpen, CalendarClock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PortalPhotoUpdate } from "@/components/portal/portal-photo-update";
import { PortalTestimonialForm } from "@/components/portal/portal-testimonial-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialArtifacts } from "@/components/verify/credential-artifacts";
import { coursesPrisma } from "@/lib/courses-db";
import { displayName } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { certificateQrDataUrl, verifyQrDataUrl } from "@/lib/qr";
import { requireGraduate } from "@/lib/session";

export const dynamic = "force-dynamic";

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export default async function PortalHome() {
  const { graduate: g } = await requireGraduate();
  const name = displayName(g);
  const [qrDataUrl, certQrDataUrl] = await Promise.all([
    verifyQrDataUrl(g.lcn),
    certificateQrDataUrl(g.lcn),
  ]);
  const left = daysUntil(g.expiresAt);

  const [
    publishedCount,
    enrolledCount,
    completedCount,
    inProgressCount,
    myTestimonial,
  ] = await Promise.all([
    coursesPrisma.course.count({ where: { state: "PUBLISHED" } }),
    coursesPrisma.enrollment.count({ where: { graduateLcn: g.lcn } }),
    coursesPrisma.enrollment.count({
      where: { graduateLcn: g.lcn, completedAt: { not: null } },
    }),
    coursesPrisma.enrollment.count({
      where: { graduateLcn: g.lcn, state: "ACTIVE", completedAt: null },
    }),
    prisma.testimonial.findFirst({
      where: { submittedByLcn: g.lcn },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Welcome, {name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Your EMT credential and learning resources.
          </p>
        </div>
        <Badge variant="verified">
          <ShieldCheck className="size-3.5" /> License active
        </Badge>
      </div>

      {left !== null && left <= 90 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-warning">
            <CalendarClock className="size-5 shrink-0" />
            <span>
              Your license expires in {left} day{left === 1 ? "" : "s"} (
              {g.expirationRaw}). Renew before it lapses to keep portal access.
              {inProgressCount > 0 && (
                <>
                  {" "}
                  You have {inProgressCount} CE course
                  {inProgressCount === 1 ? "" : "s"} in progress —{" "}
                  <Link
                    href="/portal/courses"
                    className="font-medium underline underline-offset-2 hover:opacity-80"
                  >
                    finish them for your records
                  </Link>{" "}
                  before renewal.
                </>
              )}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <CredentialArtifacts
              name={name}
              lcn={g.lcn}
              issued={g.issuedRaw}
              expiration={g.expirationRaw}
              photoUrl={g.photo?.url ?? null}
              qrDataUrl={qrDataUrl}
              certQrDataUrl={certQrDataUrl}
            />
            <PortalPhotoUpdate currentUrl={g.photo?.url ?? null} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My credential</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-0 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  License No.
                </p>
                <p className="font-mono text-xs text-on-surface">{g.lcn}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  Batch
                </p>
                <p className="text-on-surface">{g.batchCode ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  Issued
                </p>
                <p className="text-on-surface">{g.issuedRaw ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  Expires
                </p>
                <p className="text-on-surface">{g.expirationRaw ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Continuing education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                <BookOpen className="size-5 shrink-0 text-accent" />
                {publishedCount === 0 ? (
                  <span>
                    No courses are published yet. Check back soon for
                    continuing-education resources.
                  </span>
                ) : (
                  <span>
                    {publishedCount} course{publishedCount === 1 ? "" : "s"}{" "}
                    available. You&apos;re enrolled in {enrolledCount} and have
                    completed {completedCount}.
                  </span>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/courses">
                  Browse courses <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <PortalTestimonialForm
            existing={
              myTestimonial
                ? {
                    quote: myTestimonial.quote,
                    rating: myTestimonial.rating,
                    approved: myTestimonial.approved,
                    pinned: myTestimonial.pinned,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
