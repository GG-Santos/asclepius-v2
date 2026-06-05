import {
  BatchesManager,
  type BatchRow,
} from "@/components/dashboard/batches-manager";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function BatchesPage() {
  await requireAdmin();

  const [batches, counts] = await Promise.all([
    prisma.batch.findMany({
      orderBy: { code: "asc" },
      include: { logo: { select: { url: true } } },
    }),
    prisma.graduate.groupBy({ by: ["batchCode"], _count: { _all: true } }),
  ]);

  const countByCode = new Map(
    counts
      .filter((c): c is typeof c & { batchCode: string } =>
        Boolean(c.batchCode),
      )
      .map((c) => [c.batchCode, c._count._all]),
  );

  const rows: BatchRow[] = batches.map((b) => ({
    id: b.id,
    code: b.code,
    batchNumber: b.batchNumber,
    label: b.label,
    year: b.year,
    logoUrl: b.logo?.url ?? null,
    count: countByCode.get(b.code) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Batches</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Training cohorts. {rows.length} batch{rows.length === 1 ? "" : "es"}.
        </p>
      </div>
      <BatchesManager rows={rows} />
    </div>
  );
}
