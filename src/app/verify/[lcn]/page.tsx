import { ArrowLeft, ShieldAlert, ShieldX } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CredentialView } from "@/components/verify/credential-view";
import { displayName, scoreRowsFor, verificationState } from "@/lib/graduate";
import { getActiveTemplate } from "@/lib/org-settings";
import { prisma } from "@/lib/prisma";
import { certificateQrDataUrl, verifyQrDataUrl } from "@/lib/qr";
import { getSession } from "@/lib/session";

// Records a lookup on every request, so never prerender.
export const dynamic = "force-dynamic";

const TONE = {
  // Not found = stop signal; expired = caution, the person did certify once.
  error: { medallion: "bg-error/10 text-error", caps: "text-error" },
  warning: { medallion: "bg-warning/10 text-warning", caps: "text-warning" },
};

function ResultShell({
  icon,
  eyebrow,
  title,
  tone,
  lcn,
  outcome,
  hint,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  tone: keyof typeof TONE;
  lcn: string;
  outcome: "expired" | "not-found";
  hint: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div data-outcome={outcome} className="flex min-h-svh flex-col bg-surface">
      <PublicHeader />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8 text-center">
          <span
            className={`mx-auto flex size-14 items-center justify-center rounded-full ${t.medallion}`}
          >
            {icon}
          </span>
          <p className={`mt-4 text-label-caps ${t.caps}`}>{eyebrow}</p>
          <h1 className="mt-1 text-xl font-semibold text-on-surface">
            {title}
          </h1>
          <p className="mt-3">
            <span className="tabular rounded bg-surface-container px-2.5 py-1 font-mono text-sm text-on-surface dark:bg-white/[0.06]">
              {lcn}
            </span>
          </p>
          <div className="mt-3 text-sm text-on-surface-variant">{children}</div>
          <div className="mt-4 rounded-lg border border-outline-variant/60 bg-surface-low px-4 py-3 text-left text-xs leading-relaxed text-on-surface-variant dark:border-white/[0.07] dark:bg-white/[0.02]">
            {hint}
          </div>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/">
              <ArrowLeft aria-hidden /> Back to search
            </Link>
          </Button>
        </Card>
        <p className="mt-4 max-w-md text-center text-xs text-on-surface-variant">
          Every lookup runs live against the official WSL EMS registry and is
          recorded.
        </p>
      </div>
    </div>
  );
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ lcn: string }>;
}) {
  const { lcn } = await params;
  const decoded = decodeURIComponent(lcn).trim();

  const g = await prisma.graduate.findUnique({
    where: { lcn: decoded },
    include: { photo: true },
  });

  // Analytics: record the lookup outcome.
  await prisma.lookupEvent.create({
    data: { lcn: decoded, found: Boolean(g) },
  });

  if (!g || g.status === "ARCHIVED") {
    return (
      <ResultShell
        icon={<ShieldX className="size-7" aria-hidden />}
        eyebrow="Verification failed"
        title="No Active Credential Found"
        tone="error"
        lcn={decoded}
        outcome="not-found"
        hint={
          <>
            <span className="font-semibold text-on-surface">
              Double-check the number.
            </span>{" "}
            License numbers look like{" "}
            <span className="font-mono">A15-251201</span> — a single wrong
            character will miss. Numbers only appear here after certification by
            WSL EMS.
          </>
        }
      >
        No active license matches this number in the official registry.
      </ResultShell>
    );
  }

  const name = displayName(g);
  const state = verificationState(g);

  if (state === "expired") {
    return (
      <ResultShell
        icon={<ShieldAlert className="size-7" aria-hidden />}
        eyebrow="Credential lapsed"
        title="License Expired"
        tone="warning"
        lcn={g.lcn}
        outcome="expired"
        hint={
          <>
            <span className="font-semibold text-on-surface">
              This person did certify.
            </span>{" "}
            The credential existed but is no longer current — renewal through
            the training center restores verification instantly.
          </>
        }
      >
        <strong className="text-on-surface">{name.toUpperCase()}</strong>{" "}
        expired on{" "}
        <strong className="text-on-surface">
          {g.expirationRaw ?? "an unknown date"}
        </strong>
        .
      </ResultShell>
    );
  }

  const qrDataUrl = await verifyQrDataUrl(g.lcn);
  const certQrDataUrl = await certificateQrDataUrl(g.lcn);
  const template = await getActiveTemplate();
  // The graduate's own approved testimonial (incl. admin placeholders).
  const testimonial = await prisma.testimonial.findFirst({
    where: { submittedByLcn: g.lcn, approved: true },
    select: { quote: true, rating: true },
  });
  const session = await getSession();
  const manageHref =
    session?.user.role === "admin" ? `/dashboard/graduates/${g.id}` : null;

  // Cohort crest for the credential rail (public trust context).
  const batch = g.batchCode
    ? await prisma.batch.findUnique({
        where: { code: g.batchCode },
        select: {
          id: true,
          code: true,
          label: true,
          proficiencyRows: true,
          logo: { select: { url: true } },
        },
      })
    : null;

  return (
    <div data-outcome="verified">
      <CredentialView
        g={g}
        name={name}
        qrDataUrl={qrDataUrl}
        certQrDataUrl={certQrDataUrl}
        manageHref={manageHref}
        template={template}
        testimonial={testimonial}
        scoreRows={scoreRowsFor(g.batchCode, batch?.proficiencyRows)}
        batch={
          batch
            ? {
                id: batch.id,
                code: batch.code,
                label: batch.label,
                logoUrl: batch.logo?.url ?? null,
              }
            : null
        }
      />
    </div>
  );
}
