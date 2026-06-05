"use client";

import { FolderPlus, Layers, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { createBatch, deleteBatch } from "@/app/dashboard/batches/actions";
import { BatchLogoPanel } from "@/components/dashboard/batch-logo-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BatchRow = {
  id: string;
  code: string;
  batchNumber: string | null;
  label: string | null;
  year: number | null;
  logoUrl: string | null;
  count: number;
};

function CreateBatchForm() {
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
          className="grid gap-4 sm:grid-cols-4"
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
            <Label htmlFor="batchNumber">Batch #</Label>
            <Input id="batchNumber" name="batchNumber" placeholder="21" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input id="label" name="label" placeholder="2025 cohort" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="year">Year</Label>
            <Input id="year" name="year" type="number" placeholder="2025" />
          </div>
          <div className="sm:col-span-4">
            <BatchLogoPanel />
          </div>
          <div className="sm:col-span-4">
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

export function BatchesManager({ rows }: { rows: BatchRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(row: BatchRow) {
    if (row.count > 0) {
      toast.error(
        `${row.code} has ${row.count} record(s); reassign them first.`,
      );
      return;
    }
    if (!confirm(`Delete ${row.code}?`)) return;
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      await deleteBatch(fd);
      toast.success(`Deleted ${row.code}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <CreateBatchForm />

      <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-primary text-on-primary">
              <th className="px-3 py-2 text-left font-semibold">Logo</th>
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Code</th>
              <th className="px-3 py-2 text-left font-semibold">Label</th>
              <th className="px-3 py-2 text-left font-semibold">Year</th>
              <th className="px-3 py-2 text-left font-semibold">Members</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-on-surface-variant"
                >
                  No batches yet.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low"
                >
                  <td className="px-3 py-2">
                    {b.logoUrl ? (
                      <Image
                        src={b.logoUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 rounded object-contain"
                      />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded bg-surface-highest">
                        <Layers className="size-4 text-on-surface-variant/30" />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {b.batchNumber ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{b.code}</td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {b.label ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {b.year ?? "—"}
                  </td>
                  <td className="px-3 py-2">{b.count}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/batches/${b.id}`}
                        title="View detail"
                        className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(b)}
                        title={b.count > 0 ? "Batch not empty" : "Delete"}
                        className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary disabled:opacity-40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
