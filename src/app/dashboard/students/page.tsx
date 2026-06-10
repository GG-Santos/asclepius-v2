import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { StudentsDataTable } from "@/components/dashboard/students-data-table";
import type { StudentRow } from "@/components/dashboard/students-table";
import { Button } from "@/components/ui/button";
import { scoreTotal } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { rollupGraduateScores } from "@/lib/student";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;

  const where: Prisma.StudentWhereInput = {};
  if (q?.trim()) {
    where.OR = [
      { enrollmentNo: { contains: q.trim(), mode: "insensitive" } },
      { name: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  const students = await prisma.student.findMany({
    where,
    include: { photo: true },
    orderBy: [{ status: "asc" }, { enrollmentNo: "desc" }],
    take: 500,
  });

  const rows: StudentRow[] = students.map((s) => ({
    id: s.id,
    enrollmentNo: s.enrollmentNo,
    name: s.name?.trim() || s.enrollmentNo,
    batchCode: s.batchCode,
    status: s.status,
    graduatedToLcn: s.graduatedToLcn,
    total: scoreTotal(rollupGraduateScores(s)),
    photoUrl: s.photo?.url ?? null,
  }));

  const inTraining = rows.filter((r) => r.status === "IN_TRAINING").length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title="Students"
        meta={
          <p>
            <span className="font-medium text-on-surface">{inTraining}</span> in
            training
            {inTraining > 0 && " · Graduate a student to issue a license"}.
          </p>
        }
        actions={
          <Button asChild>
            <Link href="/dashboard/students/new">
              <Plus aria-hidden /> New student
            </Link>
          </Button>
        }
      />

      <StudentsDataTable rows={rows} />
    </div>
  );
}
