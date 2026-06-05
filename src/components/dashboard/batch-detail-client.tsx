"use client";

import { Layers, Pencil, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateBatch } from "@/app/dashboard/batches/actions";
import { BatchLogoPanel } from "@/components/dashboard/batch-logo-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  enrollmentNo: string;
  name: string;
  status: "IN_TRAINING" | "GRADUATED" | "WITHDRAWN";
  photoUrl: string | null;
};

type BatchData = {
  id: string;
  code: string;
  batchNumber: string | null;
  label: string | null;
  year: number | null;
  logoUrl: string | null;
};

const STATUS: Record<
  Member["status"],
  { variant: "primary" | "verified" | "neutral"; label: string }
> = {
  IN_TRAINING: { variant: "primary", label: "In training" },
  GRADUATED: { variant: "verified", label: "Graduated" },
  WITHDRAWN: { variant: "neutral", label: "Withdrawn" },
};

export function BatchDetailClient({
  batch,
  members,
}: {
  batch: BatchData;
  members: Member[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", batch.id);
    startTransition(async () => {
      await updateBatch(fd);
      toast.success("Batch updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Edit card */}
      <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)]">
        <div className="flex flex-col gap-6 p-5 md:flex-row">
          {/* Logo */}
          <div className="shrink-0 md:w-48">
            <BatchLogoPanel currentUrl={batch.logoUrl} />
          </div>

          {/* Fields */}
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
            <input type="hidden" name="id" value={batch.id} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={batch.code}
                  readOnly
                  className="bg-surface-low text-on-surface-variant"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="batchNumber">Batch #</Label>
                <Input
                  id="batchNumber"
                  name="batchNumber"
                  defaultValue={batch.batchNumber ?? ""}
                  placeholder="e.g. 23"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  name="label"
                  defaultValue={batch.label ?? ""}
                  placeholder="Optional name for this cohort"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  defaultValue={batch.year ?? ""}
                  placeholder="2025"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Member roster */}
      <div>
        <h2 className="mb-3 border-l-2 border-accent pl-2 font-semibold text-on-surface">
          Members ({members.length})
        </h2>

        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-outline-variant/60 bg-card px-6 py-14 text-center">
            <Users className="size-8 text-on-surface-variant/30" aria-hidden />
            <p className="text-sm text-on-surface-variant">
              No students assigned to this batch yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary text-on-primary">
                  <th className="px-3 py-2 text-left font-semibold">Photo</th>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Enrollment
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const st = STATUS[m.status];
                  return (
                    <tr
                      key={m.id}
                      className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low hover:bg-surface-container transition-colors"
                    >
                      <td className="px-3 py-2">
                        {m.photoUrl ? (
                          <Image
                            src={m.photoUrl}
                            alt=""
                            width={36}
                            height={45}
                            className="h-11 w-9 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-9 items-center justify-center rounded bg-surface-highest text-[10px] text-on-surface-variant">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-on-surface">
                        {m.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {m.enrollmentNo}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end">
                          <Link
                            href={`/dashboard/students/${m.id}/edit`}
                            title="Edit student"
                            className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                          >
                            <Pencil className="size-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Placeholder if no logo in header */}
      {!batch.logoUrl && (
        <p className="hidden">
          <Layers />
        </p>
      )}
    </div>
  );
}
