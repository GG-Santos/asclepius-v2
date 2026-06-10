"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Eye, Layers, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBatch } from "@/app/dashboard/batches/actions";
import type { BatchRow } from "@/components/dashboard/batches-manager";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import {
  DataTable,
  FilterHeader,
  SortableHeader,
} from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

function batchStatus(r: BatchRow): { label: string; cls: string } {
  if (r.graduated || (r.graduates > 0 && r.students === 0)) {
    return { label: "Graduated", cls: "bg-success/15 text-success" };
  }
  if (r.graduates > 0 && r.students > 0) {
    return { label: "Partial", cls: "bg-warning/15 text-warning" };
  }
  if (r.students > 0) {
    return { label: "In training", cls: "bg-primary/10 text-primary" };
  }
  return {
    label: "Empty",
    cls: "bg-surface-container text-on-surface-variant",
  };
}

const STATUS_OPTIONS = [
  { value: "Graduated", label: "Graduated" },
  { value: "Partial", label: "Partial" },
  { value: "In training", label: "In training" },
  { value: "Empty", label: "Empty" },
];

const setFilter: FilterFn<BatchRow> = (row, id, value) => {
  const set = value as string[] | undefined;
  if (!set?.length) return true;
  return set.includes(String(row.getValue(id)));
};

const searchFilter: FilterFn<BatchRow> = (row, _id, value) => {
  const q = String(value).toLowerCase();
  const r = row.original;
  return (
    r.code.toLowerCase().includes(q) ||
    (r.label ?? "").toLowerCase().includes(q) ||
    (r.professor ?? "").toLowerCase().includes(q) ||
    (r.batchNumber ? `batch ${r.batchNumber}` : "").includes(q)
  );
};

export function BatchesDataTable({ rows }: { rows: BatchRow[] }) {
  const router = useRouter();

  const profOptions = [
    ...new Set(
      rows.map((r) => r.professor).filter((p): p is string => Boolean(p)),
    ),
  ]
    .sort()
    .map((p) => ({ value: p, label: p }));

  const columns: ColumnDef<BatchRow, unknown>[] = [
    {
      id: "batch",
      accessorFn: (r) => (r.batchNumber ? Number(r.batchNumber) : 9999),
      enableHiding: false,
      header: ({ column }) => <SortableHeader column={column} label="Batch" />,
      cell: ({ row }) => {
        const b = row.original;
        return (
          <Link
            href={`/dashboard/batches/${b.id}`}
            className="flex items-center gap-2.5"
          >
            {b.logoUrl ? (
              <Image
                src={b.logoUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded object-contain"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-surface-highest">
                <Layers className="size-4 text-on-surface-variant/40" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium text-on-surface">
                {b.batchNumber ? `Batch ${b.batchNumber}` : b.code}
              </div>
              <div className="tabular truncate text-xs text-on-surface-variant">
                {b.code}
                {b.label ? ` · ${b.label}` : ""}
              </div>
            </div>
          </Link>
        );
      },
    },
    {
      id: "status",
      accessorFn: (r) => batchStatus(r).label,
      header: ({ column }) => (
        <FilterHeader column={column} label="Status" options={STATUS_OPTIONS} />
      ),
      filterFn: setFilter,
      cell: ({ row }) => {
        const b = row.original;
        const st = batchStatus(b);
        return (
          <span className="flex flex-wrap items-center gap-1">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                st.cls,
              )}
            >
              {st.label}
            </span>
            {b.graduationRequested && !b.graduated && (
              <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                Review
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: "professor",
      accessorFn: (r) => r.professor ?? "—",
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
      id: "gradActive",
      accessorFn: (r) => r.graduated,
      header: ({ column }) => (
        <SortableHeader column={column} label="Active / Grad" />
      ),
      cell: ({ row }) => (
        <span
          className="tabular block whitespace-nowrap text-right"
          title="Active licenses / total graduated"
        >
          <span className="font-semibold text-success">
            {row.original.active}
          </span>
          <span className="text-on-surface-variant">
            {" / "}
            {row.original.graduates}
          </span>
        </span>
      ),
    },
    {
      id: "avgTotal",
      accessorFn: (r) => r.avgTotal ?? -1,
      header: ({ column }) => (
        <SortableHeader column={column} label="Avg total" />
      ),
      cell: ({ row }) => (
        <span className="tabular block text-right text-on-surface">
          {row.original.avgTotal ?? "—"}
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
        const b = row.original;
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/batches/${b.id}`}
              title="View batch"
              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
            >
              <Eye className="size-4" />
            </Link>
            {b.members > 0 ? (
              <button
                type="button"
                disabled
                title={`${b.code} has ${b.members} member(s); reassign first`}
                className="rounded p-1.5 text-on-surface-variant opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            ) : (
              <ConfirmButton
                buttonTitle="Delete"
                className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
                title={`Delete ${b.code}?`}
                description={`This permanently deletes the empty batch ${b.code}${b.label ? ` (${b.label})` : ""}. This cannot be undone.`}
                successMessage={`Deleted ${b.code}.`}
                onConfirm={async () => {
                  const fd = new FormData();
                  fd.set("id", b.id);
                  await deleteBatch(fd);
                  router.refresh();
                }}
              >
                <Trash2 className="size-4" />
              </ConfirmButton>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      noun="batch"
      nounPlural="batches"
      searchPlaceholder="Search batch number, code, or name…"
      globalFilterFn={searchFilter}
      columnLabels={{
        batch: "Batch",
        status: "Status",
        professor: "Professor",
        gradActive: "Active / Grad",
        avgTotal: "Avg total",
      }}
      columnWidths={{
        batch: 220,
        status: 150,
        professor: 150,
        gradActive: 110,
        avgTotal: 100,
        actions: 90,
      }}
    />
  );
}
