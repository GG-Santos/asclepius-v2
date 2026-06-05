import type { Prisma } from "@prisma/client";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import {
  type GraduateRow,
  GraduatesTable,
} from "@/components/dashboard/graduates-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayName, verificationState } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const STATUSES = ["STUDENT", "GRADUATE", "ARCHIVED"] as const;

export default async function GraduatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const { q, status } = await searchParams;

  // This section shows graduates by default; "ALL" lifts the filter.
  const effective = status ?? "GRADUATE";
  const where: Prisma.GraduateWhereInput = {};
  if (
    effective !== "ALL" &&
    STATUSES.includes(effective as (typeof STATUSES)[number])
  ) {
    where.status = effective as (typeof STATUSES)[number];
  }
  if (q?.trim()) {
    where.OR = [
      { lcn: { contains: q.trim(), mode: "insensitive" } },
      { name: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const graduates = await prisma.graduate.findMany({
    where,
    include: { photo: true },
    orderBy: [{ batchCode: "desc" }, { lcn: "asc" }],
    take: 500,
  });

  const rows: GraduateRow[] = graduates.map((g) => ({
    id: g.id,
    lcn: g.lcn,
    name: displayName(g),
    status: g.status,
    state: verificationState(g),
    batchCode: g.batchCode,
    expirationRaw: g.expirationRaw,
    legacy: g.legacy,
    photoUrl: g.photo?.url ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Graduates &amp; Students
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {graduates.length} record{graduates.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/graduates/new">
            <Plus aria-hidden /> New record
          </Link>
        </Button>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        action="/dashboard/graduates"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or license number"
            className="pl-9"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? "GRADUATE"}
          className="h-11 rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="GRADUATE">Graduate</option>
          <option value="STUDENT">Student</option>
          <option value="ARCHIVED">Archived</option>
          <option value="ALL">All statuses</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <GraduatesTable rows={rows} />
    </div>
  );
}
