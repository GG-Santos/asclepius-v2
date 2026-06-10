"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronsUp,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteGraduate,
  setGraduateStatus,
} from "@/app/dashboard/graduates/actions";
import { Badge } from "@/components/ui/badge";
import type { VerificationState } from "@/lib/graduate";
import { medalFor } from "@/lib/ranking";

export type GraduateRow = {
  id: string;
  lcn: string;
  name: string;
  status: "STUDENT" | "GRADUATE" | "ARCHIVED";
  state: VerificationState;
  batchCode: string | null;
  professor: string | null;
  expirationRaw: string | null;
  legacy: boolean;
  photoUrl: string | null;
  rank?: number | null;
};

const STATE_BADGE: Record<
  VerificationState,
  { variant: "verified" | "expired" | "neutral"; label: string }
> = {
  verified: { variant: "verified", label: "Verified" },
  expired: { variant: "expired", label: "Expired" },
  archived: { variant: "neutral", label: "Archived" },
};

export function GraduatesTable({
  rows,
  variant = "graduates",
}: {
  rows: GraduateRow[];
  variant?: "graduates" | "students";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function promote(g: GraduateRow) {
    const fd = new FormData();
    fd.set("id", g.id);
    fd.set("status", "GRADUATE");
    startTransition(async () => {
      await setGraduateStatus(fd);
      toast.success(`${g.lcn} promoted to graduate`);
      router.refresh();
    });
  }

  function toggleArchive(g: GraduateRow) {
    const next = g.status === "ARCHIVED" ? "GRADUATE" : "ARCHIVED";
    const fd = new FormData();
    fd.set("id", g.id);
    fd.set("status", next);
    startTransition(async () => {
      await setGraduateStatus(fd);
      toast.success(
        next === "ARCHIVED" ? `Archived ${g.lcn}` : `Restored ${g.lcn}`,
      );
      router.refresh();
    });
  }

  function removeRow(g: GraduateRow) {
    if (!confirm(`Delete record ${g.lcn}? This cannot be undone.`)) return;
    const fd = new FormData();
    fd.set("id", g.id);
    startTransition(async () => {
      await deleteGraduate(fd);
      toast.success(`Deleted ${g.lcn}`);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-outline-variant/60 bg-card p-12 text-center shadow-[var(--shadow-clinical)]">
        <div className="relative mb-6 size-48">
          <Image
            src="/assets/img/generated/empty-records.webp"
            alt="No records found"
            fill
            className="object-contain"
          />
        </div>
        <h3 className="text-lg font-semibold text-on-surface">
          No Records Found
        </h3>
        <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
          We couldn&apos;t find any graduates or students matching your current
          search criteria.
        </p>
        <Link
          href="/dashboard/graduates/new"
          className="mt-6 inline-flex h-10 items-center justify-center rounded bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-accent transition-colors"
        >
          Create first record
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container text-on-surface dark:border-white/[0.06]">
            <th className="px-3 py-2 text-left font-semibold">Photo</th>
            <th className="px-3 py-2 text-left font-semibold">Name</th>
            <th className="px-3 py-2 text-left font-semibold">License No.</th>
            <th className="px-3 py-2 text-left font-semibold">Batch</th>
            <th className="px-3 py-2 text-left font-semibold">Rank</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
            <th className="px-3 py-2 text-left font-semibold">Expiry</th>
            <th className="px-3 py-2 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => {
            const badge = STATE_BADGE[g.state];
            return (
              <tr
                key={g.id}
                className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low"
              >
                <td className="px-3 py-2">
                  {g.photoUrl ? (
                    <Image
                      src={g.photoUrl}
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
                <td className="px-3 py-2">
                  <span className="font-medium text-on-surface">{g.name}</span>
                  {g.legacy && (
                    <Badge variant="legacy" className="ml-2">
                      legacy
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{g.lcn}</td>
                <td className="px-3 py-2 text-on-surface-variant">
                  {g.batchCode ?? "—"}
                </td>
                <td className="tabular px-3 py-2 text-on-surface-variant">
                  {g.rank != null
                    ? `${medalFor(g.rank) ?? ""} #${g.rank}`
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </td>
                <td className="px-3 py-2 text-on-surface-variant">
                  {g.expirationRaw ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/dashboard/graduates/${g.id}`}
                      title="View record"
                      className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                    >
                      <Eye className="size-4" />
                    </Link>
                    <Link
                      href={`/dashboard/graduates/${g.id}/edit`}
                      title="Edit"
                      className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    {variant === "students" && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => promote(g)}
                        title="Promote to graduate"
                        className="rounded p-1.5 text-on-surface-variant hover:bg-success/10 hover:text-success disabled:opacity-50"
                      >
                        <ChevronsUp className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggleArchive(g)}
                      title={g.status === "ARCHIVED" ? "Restore" : "Archive"}
                      className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent disabled:opacity-50"
                    >
                      {g.status === "ARCHIVED" ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeRow(g)}
                      title="Delete"
                      className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
