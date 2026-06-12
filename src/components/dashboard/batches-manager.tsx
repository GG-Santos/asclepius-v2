"use client";

import { FolderPlus } from "lucide-react";
import Link from "next/link";
import { BatchesDataTable } from "@/components/dashboard/batches-data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";

export type BatchRow = {
  id: string;
  code: string;
  batchNumber: string | null;
  label: string | null;
  logoUrl: string | null;
  graduated: boolean; // batch graduation flag
  students: number; // in training
  passed: number;
  passRate: number | null;
  graduates: number; // total graduated
  active: number; // graduates with a valid (non-expired) license
  members: number; // students + graduates
  avgTotal: number | null; // average graduate Total Evaluation (0–100)
  gradPassRate: number | null; // % of graded graduates scoring ≥ 70
  professor: string | null; // instructor of record
  graduationRequested: boolean; // professor asked for graduation review
};

export type BatchesSummary = {
  cohorts: number;
  students: number;
  passed: number;
  passRate: number | null;
};

export type ProfessorOption = { id: string; name: string };

export function BatchesManager({ rows }: { rows: BatchRow[] }) {
  const totalInTraining = rows.reduce((a, r) => a + r.students, 0);
  const totalGraduated = rows.reduce((a, r) => a + r.graduates, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        meta={
          <p>
            <span className="font-medium text-on-surface">
              {totalInTraining}
            </span>{" "}
            in training ·{" "}
            <span className="font-medium text-on-surface">
              {totalGraduated}
            </span>{" "}
            graduated across{" "}
            <span className="font-medium text-on-surface">{rows.length}</span>{" "}
            {rows.length === 1 ? "cohort" : "cohorts"}
          </p>
        }
        actions={
          <Button asChild>
            <Link href="/dashboard/batches/new">
              <FolderPlus aria-hidden />
              New batch
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-outline-variant/60 bg-card p-10 text-center text-sm text-on-surface-variant">
          No batches yet. Create your first cohort to start tracking students.
        </div>
      ) : (
        <BatchesDataTable rows={rows} />
      )}
    </div>
  );
}
