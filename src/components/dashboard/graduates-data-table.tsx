"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  Archive,
  ArchiveRestore,
  CalendarPlus,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  deleteGraduate,
  renewGraduate,
  setGraduateStatus,
} from "@/app/dashboard/graduates/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import type { GraduateRow } from "@/components/dashboard/graduates-table";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  FilterHeader,
  SortableHeader,
} from "@/components/ui/data-table";
import type { VerificationState } from "@/lib/graduate";
import { medalFor } from "@/lib/ranking";

const STATE_BADGE: Record<
  VerificationState,
  { variant: "verified" | "expired" | "neutral"; label: string }
> = {
  verified: { variant: "verified", label: "Verified" },
  expired: { variant: "expired", label: "Expired" },
  archived: { variant: "neutral", label: "Archived" },
};

const STATE_OPTIONS = [
  { value: "verified", label: "Verified" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

const setFilter: FilterFn<GraduateRow> = (row, id, value) => {
  const set = value as string[] | undefined;
  if (!set?.length) return true;
  return set.includes(String(row.getValue(id)));
};

const searchFilter: FilterFn<GraduateRow> = (row, _id, value) => {
  const q = String(value).toLowerCase();
  const r = row.original;
  return (
    r.name.toLowerCase().includes(q) ||
    r.lcn.toLowerCase().includes(q) ||
    (r.batchCode ?? "").toLowerCase().includes(q) ||
    (r.professor ?? "").toLowerCase().includes(q)
  );
};

export function GraduatesDataTable({ rows }: { rows: GraduateRow[] }) {
  const router = useRouter();

  const batchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.batchCode) set.add(r.batchCode);
    return [...set].sort().map((b) => ({ value: b, label: b }));
  }, [rows]);

  const profOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.professor) set.add(r.professor);
    return [...set].sort().map((p) => ({ value: p, label: p }));
  }, [rows]);

  const columns: ColumnDef<GraduateRow, unknown>[] = [
    {
      id: "photo",
      header: () => <span className="sr-only">Photo</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) =>
        row.original.photoUrl ? (
          <Image
            src={row.original.photoUrl}
            alt=""
            width={36}
            height={45}
            className="h-11 w-9 rounded object-cover"
          />
        ) : (
          <div className="flex h-11 w-9 items-center justify-center rounded bg-surface-highest text-[10px] text-on-surface-variant">
            —
          </div>
        ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => (
        <span className="font-medium uppercase text-on-surface">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "lcn",
      header: ({ column }) => (
        <SortableHeader column={column} label="License No." />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.lcn}</span>
      ),
    },
    {
      accessorKey: "batchCode",
      header: ({ column }) => (
        <FilterHeader
          column={column}
          label="Batch"
          options={batchOptions}
          sortable
        />
      ),
      filterFn: setFilter,
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.batchCode ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "professor",
      header: ({ column }) => (
        <FilterHeader
          column={column}
          label="Professor"
          options={profOptions}
          sortable
        />
      ),
      filterFn: setFilter,
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.professor ?? "—"}
        </span>
      ),
    },
    {
      id: "rank",
      accessorFn: (r) => r.rank ?? Number.MAX_SAFE_INTEGER,
      header: ({ column }) => <SortableHeader column={column} label="Rank" />,
      cell: ({ row }) => {
        const rank = row.original.rank;
        return (
          <span className="tabular text-on-surface-variant">
            {rank != null ? `${medalFor(rank) ?? ""} #${rank}` : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "state",
      header: ({ column }) => (
        <FilterHeader column={column} label="Status" options={STATE_OPTIONS} />
      ),
      filterFn: setFilter,
      cell: ({ row }) => {
        const badge = STATE_BADGE[row.original.state];
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      accessorKey: "expirationRaw",
      enableSorting: false,
      header: () => (
        <span className="font-semibold text-on-surface">Expiry</span>
      ),
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.expirationRaw ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => (
        <span className="font-semibold text-on-surface">Actions</span>
      ),
      cell: ({ row }) => {
        const g = row.original;
        return (
          <div className="flex items-center gap-1">
            {g.status === "GRADUATE" && (
              <ConfirmButton
                buttonTitle="Renew license (+1 year)"
                className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-success/10 hover:text-success"
                title={`Renew ${g.lcn}?`}
                description="Extends the license one year past its current expiry. The current expiry date becomes the latest re-certification."
                confirmLabel="Renew +1 year"
                tone="primary"
                successMessage={`Renewed ${g.lcn} — expiry extended one year.`}
                onConfirm={async () => {
                  const fd = new FormData();
                  fd.set("id", g.id);
                  await renewGraduate(fd);
                  router.refresh();
                }}
              >
                <CalendarPlus className="size-4" />
              </ConfirmButton>
            )}
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
            <ConfirmButton
              buttonTitle={g.status === "ARCHIVED" ? "Restore" : "Archive"}
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-accent"
              title={
                g.status === "ARCHIVED"
                  ? `Restore ${g.lcn}?`
                  : `Archive ${g.lcn}?`
              }
              description={
                g.status === "ARCHIVED"
                  ? "Moves the record back into the active graduates list."
                  : "Moves the record out of the active list. You can restore it anytime."
              }
              confirmLabel={g.status === "ARCHIVED" ? "Restore" : "Archive"}
              tone="primary"
              successMessage={
                g.status === "ARCHIVED"
                  ? `Restored ${g.lcn}`
                  : `Archived ${g.lcn}`
              }
              onConfirm={async () => {
                const fd = new FormData();
                fd.set("id", g.id);
                fd.set(
                  "status",
                  g.status === "ARCHIVED" ? "GRADUATE" : "ARCHIVED",
                );
                await setGraduateStatus(fd);
                router.refresh();
              }}
            >
              {g.status === "ARCHIVED" ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </ConfirmButton>
            <ConfirmButton
              buttonTitle="Delete"
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
              title={`Delete record ${g.lcn}?`}
              description="This permanently deletes the graduate record and its public verification page. This cannot be undone."
              successMessage={`Deleted ${g.lcn}.`}
              onConfirm={async () => {
                const fd = new FormData();
                fd.set("id", g.id);
                await deleteGraduate(fd);
                router.refresh();
              }}
            >
              <Trash2 className="size-4" />
            </ConfirmButton>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      noun="record"
      searchPlaceholder="Search name, license number, or batch…"
      globalFilterFn={searchFilter}
      columnLabels={{
        name: "Name",
        lcn: "License No.",
        batchCode: "Batch",
        professor: "Professor",
        rank: "Rank",
        state: "Status",
        expirationRaw: "Expiry",
      }}
      columnWidths={{
        photo: 56,
        name: 220,
        lcn: 130,
        batchCode: 100,
        professor: 150,
        rank: 100,
        state: 120,
        expirationRaw: 150,
        actions: 140,
      }}
      initialVisibility={{ professor: false, lcn: false }}
      storageKey="graduates"
    />
  );
}
