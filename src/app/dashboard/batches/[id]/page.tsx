import { notFound } from "next/navigation";
import { BatchDetailClient } from "@/components/dashboard/batch-detail-client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      logo: { select: { url: true } },
      students: {
        select: {
          id: true,
          enrollmentNo: true,
          name: true,
          status: true,
          photo: { select: { url: true } },
        },
        orderBy: { enrollmentNo: "asc" },
      },
    },
  });

  if (!batch) notFound();

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">
          {batch.batchNumber ? `Batch ${batch.batchNumber}` : batch.code}
          {batch.label && (
            <span className="ml-2 text-lg font-normal text-on-surface-variant">
              — {batch.label}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {batch.students.length} member
          {batch.students.length !== 1 ? "s" : ""}
        </p>
      </div>

      <BatchDetailClient
        batch={{
          id: batch.id,
          code: batch.code,
          batchNumber: batch.batchNumber,
          label: batch.label,
          year: batch.year,
          logoUrl: batch.logo?.url ?? null,
        }}
        members={batch.students.map((s) => ({
          id: s.id,
          enrollmentNo: s.enrollmentNo,
          name: s.name ?? s.enrollmentNo,
          status: s.status,
          photoUrl: s.photo?.url ?? null,
        }))}
      />
    </div>
  );
}
