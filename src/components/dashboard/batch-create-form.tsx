"use client";

import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createBatch } from "@/app/dashboard/batches/actions";
import { BatchGradingSchemeEditor } from "@/components/dashboard/batch-grading-scheme-editor";
import { BatchLogoPanel } from "@/components/dashboard/batch-logo-panel";
import type { ProfessorOption } from "@/components/dashboard/batches-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BatchCreateForm({
  professors,
}: {
  professors: ProfessorOption[];
}) {
  const [state, action, pending] = useActionState(createBatch, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Batch created.");
      formRef.current?.reset();
      setCode("");
      router.push(
        state.batchId
          ? `/dashboard/batches/${state.batchId}`
          : "/dashboard/batches",
      );
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 md:flex-row">
          <div className="shrink-0 md:w-48">
            <BatchLogoPanel />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="BATCH-21"
                aria-invalid={fe.code ? true : undefined}
              />
              {fe.code && <p className="text-xs text-error">{fe.code}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label">Batch name</Label>
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
                <option value="">- Unassigned -</option>
                {professors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="professor">Display name</Label>
              <Input
                id="professor"
                name="professor"
                placeholder="Wilky S. Lao"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="description">Public description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Shown on the public cohort page (/cohorts)..."
                className="rounded-md border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                aria-invalid={fe.description ? true : undefined}
              />
              {fe.description && (
                <p className="text-xs text-error">{fe.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <BatchGradingSchemeEditor
          batchCode={code.trim().toUpperCase()}
          initialScheme={null}
          gradedStudentCount={0}
          hasPracticalColumnData={false}
          formFieldName="gradingScheme"
          defaultTemplateId="batch-17-official"
          stripDefaultDates
        />
        {fe.gradingScheme && (
          <p className="mt-2 text-xs text-error">{fe.gradingScheme}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          <FolderPlus aria-hidden /> {pending ? "Creating..." : "Create batch"}
        </Button>
      </div>
    </form>
  );
}
