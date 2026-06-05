import { ArrowLeft, ShieldAlert, ShieldX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CredentialView } from "@/components/verify/credential-view";
import { displayName, verificationState } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { verifyQrDataUrl } from "@/lib/qr";
import { getSession } from "@/lib/session";

// Records a lookup on every request, so never prerender.
export const dynamic = "force-dynamic";

function ResultShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 text-center">
        {icon}
        <h1 className="mt-4 text-xl font-semibold text-on-surface">{title}</h1>
        <div className="mt-2 text-sm text-on-surface-variant">{children}</div>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">
            <ArrowLeft aria-hidden /> Back to search
          </Link>
        </Button>
      </Card>
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
        icon={
          <ShieldX className="mx-auto size-10 text-secondary" aria-hidden />
        }
        title="No Active Credential Found"
      >
        No active license matches{" "}
        <span className="font-mono text-on-surface">{decoded}</span> in the
        official registry.
      </ResultShell>
    );
  }

  const name = displayName(g);
  const state = verificationState(g);

  if (state === "expired") {
    return (
      <ResultShell
        icon={
          <ShieldAlert className="mx-auto size-10 text-secondary" aria-hidden />
        }
        title="License Expired"
      >
        <strong className="text-on-surface">{name.toUpperCase()}</strong> (
        <span className="font-mono">{g.lcn}</span>) expired on{" "}
        <strong className="text-on-surface">
          {g.expirationRaw ?? "an unknown date"}
        </strong>
        .
      </ResultShell>
    );
  }

  const qrDataUrl = await verifyQrDataUrl(g.lcn);
  const session = await getSession();
  const manageHref =
    session?.user.role === "admin" ? `/dashboard/graduates/${g.id}` : null;
  return (
    <CredentialView
      g={g}
      name={name}
      qrDataUrl={qrDataUrl}
      manageHref={manageHref}
    />
  );
}
