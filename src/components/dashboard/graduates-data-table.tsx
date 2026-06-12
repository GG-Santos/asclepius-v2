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
import {
  TablePhotoSelect,
  TableSelectPageButton,
} from "@/components/dashboard/table-photo-selector";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DataTable,
  FilterHeader,
  SortableHeader,
} from "@/components/ui/data-table";
import { yearsLabel, yearsNoun } from "@/lib/expiry-label";
import type { VerificationState } from "@/lib/graduate";
import { medalFor } from "@/lib/ranking";
import { cn } from "@/lib/utils";

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

const SCOPES = [
  { value: "GRADUATE", label: "Graduates" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "ALL", label: "All" },
] as const;

type GraduateScope = (typeof SCOPES)[number]["value"];

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

export function GraduatesDataTable({
  rows,
  scope = "GRADUATE",
  validityYears = 1,
}: {
  rows: GraduateRow[];
  scope?: GraduateScope;
  /** Org expiry policy: license validity period used in renewal copy. */
  validityYears?: number;
}) {
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

  async function bulkRenew(selectedRows: GraduateRow[]) {
    for (const row of selectedRows.filter((r) => r.status === "GRADUATE")) {
      const fd = new FormData();
      fd.set("id", row.id);
      await renewGraduate(fd);
    }
    router.refresh();
  }

  async function bulkStatus(selectedRows: GraduateRow[], status: string) {
    for (const row of selectedRows) {
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("status", status);
      await setGraduateStatus(fd);
    }
    router.refresh();
  }

  async function bulkDelete(selectedRows: GraduateRow[]) {
    for (const row of selectedRows) {
      const fd = new FormData();
      fd.set("id", row.id);
      await deleteGraduate(fd);
    }
    router.refresh();
  }

  const columns: ColumnDef<GraduateRow, unknown>[] = [
    {
      id: "photo",
      header: ({ table }) => {
        const checked = table.getIsAllPageRowsSelected();
        return (
          <TableSelectPageButton
            checked={checked}
            mixed={!checked && table.getIsSomePageRowsSelected()}
            onToggle={() => table.toggleAllPageRowsSelected(!checked)}
            label="Select visible graduates"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <TablePhotoSelect
          src={row.original.photoUrl}
          label={row.original.name}
          selected={row.getIsSelected()}
          onToggle={() => row.toggleSelected(!row.getIsSelected())}
        />
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
                buttonTitle={`Renew license (+${yearsLabel(validityYears)})`}
                className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-success/10 hover:text-success"
                title={`Renew ${g.lcn}?`}
                description={`Extends the license ${yearsNoun(validityYears)} past its current expiry. The current expiry date becomes the latest re-certification.`}
                confirmLabel={`Renew +${yearsLabel(validityYears)}`}
                tone="primary"
                successMessage={`Renewed ${g.lcn} — expiry extended ${yearsNoun(validityYears)}.`}
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
      getRowId={(row) => row.id}
      enableRowSelection
      selectionToolbar={(selectedRows, clearSelection) => {
        const renewable = selectedRows.filter((r) => r.status === "GRADUATE");
        const restoreMode = selectedRows.every((r) => r.status === "ARCHIVED");
        const nextStatus = restoreMode ? "GRADUATE" : "ARCHIVED";
        return (
          <>
            <ConfirmButton
              buttonTitle="Bulk renew"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              disabled={renewable.length === 0}
              title={`Renew ${renewable.length} selected record${renewable.length === 1 ? "" : "s"}?`}
              description={`Extends each selected active graduate by ${yearsNoun(validityYears)}. Archived records are skipped.`}
              confirmLabel={`Renew +${yearsLabel(validityYears)}`}
              tone="primary"
              successMessage={`Renewed ${renewable.length} record${renewable.length === 1 ? "" : "s"}.`}
              onConfirm={async () => {
                await bulkRenew(selectedRows);
                clearSelection();
              }}
            >
              <CalendarPlus aria-hidden />
              Renew
            </ConfirmButton>
            <ConfirmButton
              buttonTitle={restoreMode ? "Bulk restore" : "Bulk archive"}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              title={`${restoreMode ? "Restore" : "Archive"} ${selectedRows.length} selected record${selectedRows.length === 1 ? "" : "s"}?`}
              description={
                restoreMode
                  ? "Moves the selected archived records back into the active graduates list."
                  : "Moves the selected records out of the active graduates list. You can restore them later."
              }
              confirmLabel={restoreMode ? "Restore" : "Archive"}
              tone="primary"
              successMessage={`${restoreMode ? "Restored" : "Archived"} ${selectedRows.length} record${selectedRows.length === 1 ? "" : "s"}.`}
              onConfirm={async () => {
                await bulkStatus(selectedRows, nextStatus);
                clearSelection();
              }}
            >
              {restoreMode ? (
                <ArchiveRestore aria-hidden />
              ) : (
                <Archive aria-hidden />
              )}
              {restoreMode ? "Restore" : "Archive"}
            </ConfirmButton>
            <ConfirmButton
              buttonTitle="Bulk delete"
              className={cn(
                buttonVariants({ variant: "destructive", size: "sm" }),
              )}
              title={`Delete ${selectedRows.length} selected record${selectedRows.length === 1 ? "" : "s"}?`}
              description="This permanently deletes the selected graduate records and their public verification pages. This cannot be undone."
              successMessage={`Deleted ${selectedRows.length} record${selectedRows.length === 1 ? "" : "s"}.`}
              onConfirm={async () => {
                await bulkDelete(selectedRows);
                clearSelection();
              }}
            >
              <Trash2 aria-hidden />
              Delete
            </ConfirmButton>
          </>
        );
      }}
      noun="record"
      searchPlaceholder="Search name, license number, or batch…"
      globalFilterFn={searchFilter}
      toolbar={
        <nav
          aria-label="Record status"
          className="flex h-11 items-center gap-1 rounded-md border border-outline-variant/60 bg-card p-1 text-xs font-semibold dark:border-white/[0.08]"
        >
          {SCOPES.map((tab) => {
            const active = scope === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/dashboard/graduates?status=${tab.value}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "flex h-9 items-center rounded px-3 text-accent bg-accent/10"
                    : "flex h-9 items-center rounded px-3 text-on-surface-variant hover:text-on-surface"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      }
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
