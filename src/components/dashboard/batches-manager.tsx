"use client";

import { FolderPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createBatch } from "@/app/dashboard/batches/actions";
import { BatchLogoPanel } from "@/components/dashboard/batch-logo-panel";
import { BatchesDataTable } from "@/components/dashboard/batches-data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function CreateBatchForm({ professors }: { professors: ProfessorOption[] }) {
  const [state, action, pending] = useActionState(createBatch, {});
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Batch created.");
      formRef.current?.reset();
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add batch</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={action}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              placeholder="BATCH-21"
              aria-invalid={fe.code ? true : undefined}
            />
            {fe.code && <p className="text-xs text-error">{fe.code}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Batch name (optional)</Label>
            <Input id="label" name="label" placeholder="2025 cohort" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="professorId">Professor account</Label>
            <select
              id="professorId"
              name="professorId"
              defaultValue=""
              className="h-11 rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">— Unassigned —</option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="professor">Display name (optional)</Label>
            <Input id="professor" name="professor" placeholder="Wilky S. Lao" />
          </div>
          <div className="sm:col-span-2">
            <BatchLogoPanel />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              <FolderPlus aria-hidden />{" "}
              {pending ? "Creating…" : "Create batch"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function BatchesManager({
  rows,
  professors,
}: {
  rows: BatchRow[];
  professors: ProfessorOption[];
}) {
  const [showForm, setShowForm] = useState(false);

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
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X aria-hidden /> : <FolderPlus aria-hidden />}
            {showForm ? "Close" : "New batch"}
          </Button>
        }
      />

      {showForm && <CreateBatchForm professors={professors} />}

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
