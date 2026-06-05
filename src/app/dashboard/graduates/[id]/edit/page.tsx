import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateGraduate } from "@/app/dashboard/graduates/actions";
import {
  type GraduateDefaults,
  GraduateForm,
} from "@/components/dashboard/graduate-form";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

function numToStr(n: number | null): string | undefined {
  return n === null || n === undefined ? undefined : String(n);
}

export default async function EditGraduatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const g = await prisma.graduate.findUnique({
    where: { id },
    include: { photo: true },
  });
  if (!g) notFound();

  const defaults: GraduateDefaults = {
    lcn: g.lcn,
    name: g.name ?? undefined,
    firstName: g.firstName ?? undefined,
    middleName: g.middleName ?? undefined,
    lastName: g.lastName ?? undefined,
    suffix: g.suffix ?? undefined,
    batchCode: g.batchCode ?? undefined,
    status: g.status,
    legacy: g.legacy,
    issuedRaw: g.issuedRaw ?? undefined,
    expirationRaw: g.expirationRaw ?? undefined,
    registrationRaw: g.registrationRaw ?? undefined,
    scoreFWE: numToStr(g.scoreFWE),
    scoreSJE: numToStr(g.scoreSJE),
    scoreEP: numToStr(g.scoreEP),
    scorePAS: numToStr(g.scorePAS),
    scoreCCST: numToStr(g.scoreCCST),
    scoreCCSM: numToStr(g.scoreCCSM),
    ranking: numToStr(g.ranking),
    notes: g.notes ?? undefined,
    photoUrl: g.photo?.url ?? null,
  };

  const action = updateGraduate.bind(null, g.id);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/graduates"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Back to records
      </Link>
      <GraduateForm
        action={action}
        defaults={defaults}
        submitLabel="Update Student"
        successMessage="Record updated."
        lockLcn
        deleteId={g.id}
      />
    </div>
  );
}
