import {
  BatchesManager,
  type BatchRow,
} from "@/components/dashboard/batches-manager";
import { type GradeResult, gradeStudent, rollupBatch } from "@/lib/grading";
import { batchNumber, scoreTotal, verificationState } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function BatchesPage() {
  await requireAdmin();

  const [batches, students, graduates] = await Promise.all([
    prisma.batch.findMany({
      orderBy: { code: "asc" },
      include: { logo: { select: { url: true } } },
    }),
    prisma.student.findMany({
      where: { status: "IN_TRAINING" },
      select: {
        batchCode: true,
        scoreFWE: true,
        scoreEP: true,
        scorePAS: true,
        scoreCCST: true,
        scoreCCSM: true,
        granularGrades: true,
      },
    }),
    prisma.graduate.findMany({
      select: {
        batchCode: true,
        status: true,
        expiresAt: true,
        scoreFWE: true,
        scoreSJE: true,
        scoreEP: true,
        scorePAS: true,
        scoreCCST: true,
        scoreCCSM: true,
      },
    }),
  ]);

  // In-training grading (pass rate), grouped by batch code.
  const byCode = new Map<string, GradeResult[]>();
  for (const s of students) {
    if (!s.batchCode) continue;
    const arr = byCode.get(s.batchCode) ?? [];
    arr.push(
      gradeStudent({
        scoreFWE: s.scoreFWE,
        scoreEP: s.scoreEP,
        scorePAS: s.scorePAS,
        scoreCCST: s.scoreCCST,
        scoreCCSM: s.scoreCCSM,
        granularGrades: s.granularGrades,
      }),
    );
    byCode.set(s.batchCode, arr);
  }

  // Graduate lifecycle per batch: total graduated, active licenses, and the
  // graduate-score outcomes (avg Total Evaluation + pass rate at ≥75).
  const gradStats = new Map<
    string,
    {
      graduated: number;
      active: number;
      totalSum: number;
      graded: number;
      passed: number;
    }
  >();
  for (const g of graduates) {
    if (!g.batchCode) continue;
    const cur = gradStats.get(g.batchCode) ?? {
      graduated: 0,
      active: 0,
      totalSum: 0,
      graded: 0,
      passed: 0,
    };
    cur.graduated += 1;
    if (verificationState(g) === "verified") cur.active += 1;
    const t = scoreTotal(g);
    if (t != null) {
      cur.totalSum += t;
      cur.graded += 1;
      if (t >= 70) cur.passed += 1;
    }
    gradStats.set(g.batchCode, cur);
  }

  const rows: BatchRow[] = batches.map((b) => {
    const summary = rollupBatch(byCode.get(b.code) ?? []);
    const gs = gradStats.get(b.code) ?? {
      graduated: 0,
      active: 0,
      totalSum: 0,
      graded: 0,
      passed: 0,
    };
    return {
      id: b.id,
      code: b.code,
      batchNumber: b.batchNumber ?? batchNumber(b.code)?.toString() ?? null,
      label: b.label,
      logoUrl: b.logo?.url ?? null,
      graduated: b.graduated,
      students: summary.total,
      passed: summary.passed,
      passRate: summary.passRate,
      graduates: gs.graduated,
      active: gs.active,
      members: summary.total + gs.graduated,
      avgTotal:
        gs.graded > 0 ? Math.round((gs.totalSum / gs.graded) * 10) / 10 : null,
      gradPassRate:
        gs.graded > 0 ? Math.round((gs.passed / gs.graded) * 100) : null,
      professor: b.professor ?? null,
      graduationRequested: b.graduationRequested,
    };
  });

  // Accounts an admin can assign as a batch's professor (admins + professors).
  const professors = await prisma.user.findMany({
    where: { role: { in: ["admin", "professor"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <BatchesManager rows={rows} professors={professors} />
    </div>
  );
}
