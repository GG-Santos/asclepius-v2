"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import {
  Eye,
  GraduationCap,
  Pencil,
  Trash2,
  Undo2,
  UserRoundX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteStudent,
  setStudentFailed,
} from "@/app/dashboard/students/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { PromoteStudentDialog } from "@/components/dashboard/promote-student-dialog";
import type { StudentRow } from "@/components/dashboard/students-table";
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
import { cn } from "@/lib/utils";

const STATUS: Record<
  StudentRow["status"],
  { variant: "primary" | "verified" | "neutral" | "expired"; label: string }
> = {
  IN_TRAINING: { variant: "primary", label: "In training" },
  GRADUATED: { variant: "verified", label: "Graduated" },
  WITHDRAWN: { variant: "neutral", label: "Withdrawn" },
  FAILED: { variant: "expired", label: "Failed" },
};

const STATUS_OPTIONS = [
  { value: "IN_TRAINING", label: "In training" },
  { value: "FAILED", label: "Failed" },
];

const SCOPES = [
  { value: "ACTIVE", label: "Students" },
  { value: "FAILED", label: "Failed" },
] as const;

type StudentScope = (typeof SCOPES)[number]["value"];

const setFilter: FilterFn<StudentRow> = (row, id, value) => {
  const set = value as string[] | undefined;
  if (!set?.length) return true;
  return set.includes(String(row.getValue(id)));
};

const searchFilter: FilterFn<StudentRow> = (row, _id, value) => {
  const q = String(value).toLowerCase();
  const r = row.original;
  return (
    r.name.toLowerCase().includes(q) ||
    r.enrollmentNo.toLowerCase().includes(q) ||
    (r.batchCode ?? "").toLowerCase().includes(q)
  );
};

export function StudentsDataTable({
  rows,
  scope = "ACTIVE",
}: {
  rows: StudentRow[];
  scope?: StudentScope;
}) {
  const router = useRouter();
  const [promoting, setPromoting] = useState<StudentRow | null>(null);

  const batchOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.batchCode) set.add(r.batchCode);
    return [...set].sort().map((b) => ({ value: b, label: b }));
  }, [rows]);

  function handlePromoteSuccess(lcn: string) {
    toast.success(`Graduated — license ${lcn} issued.`, {
      action: {
        label: "View graduate",
        onClick: () =>
          router.push(`/dashboard/graduates?q=${encodeURIComponent(lcn)}`),
      },
    });
    router.refresh();
  }

  async function bulkFailed(selectedRows: StudentRow[], failed: boolean) {
    for (const row of selectedRows) {
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("failed", String(failed));
      await setStudentFailed(fd);
    }
    router.refresh();
  }

  async function bulkDelete(selectedRows: StudentRow[]) {
    for (const row of selectedRows) {
      const fd = new FormData();
      fd.set("id", row.id);
      await deleteStudent(fd);
    }
    router.refresh();
  }

  const columns: ColumnDef<StudentRow, unknown>[] = [
    {
      id: "photo",
      header: ({ table }) => {
        const checked = table.getIsAllPageRowsSelected();
        return (
          <TableSelectPageButton
            checked={checked}
            mixed={!checked && table.getIsSomePageRowsSelected()}
            onToggle={() => table.toggleAllPageRowsSelected(!checked)}
            label="Select visible students"
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
      accessorKey: "enrollmentNo",
      header: ({ column }) => (
        <SortableHeader column={column} label="Student No." />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.enrollmentNo}</span>
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
      accessorKey: "status",
      header: ({ column }) => (
        <FilterHeader column={column} label="Status" options={STATUS_OPTIONS} />
      ),
      filterFn: setFilter,
      cell: ({ row }) => {
        const st = STATUS[row.original.status];
        return (
          <span className="flex items-center gap-2">
            <Badge variant={st.variant}>{st.label}</Badge>
            {row.original.graduatedToLcn && (
              <span className="font-mono text-[10px] text-on-surface-variant">
                {row.original.graduatedToLcn}
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: "total",
      accessorFn: (r) => r.total ?? -1,
      header: ({ column }) => <SortableHeader column={column} label="Total" />,
      cell: ({ row }) => (
        <span className="tabular font-mono">
          {row.original.total === null ? "—" : `${row.original.total}%`}
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
        const s = row.original;
        return (
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/students/${s.id}`}
              title="View"
              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
            >
              <Eye className="size-4" />
            </Link>
            <Link
              href={`/dashboard/students/${s.id}/edit`}
              title="Edit"
              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
            >
              <Pencil className="size-4" />
            </Link>
            {s.status === "IN_TRAINING" && (
              <button
                type="button"
                onClick={() => setPromoting(s)}
                title="Graduate (issue license)"
                className="rounded p-1.5 text-on-surface-variant hover:bg-success/10 hover:text-success disabled:opacity-50"
              >
                <GraduationCap className="size-4" />
              </button>
            )}
            {s.status === "IN_TRAINING" && (
              <ConfirmButton
                buttonTitle="Mark failed"
                className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                title={`Mark ${s.name} as failed?`}
                description="Failed students leave the default list, can never be promoted, and stay on record. You can restore them later."
                confirmLabel="Mark failed"
                tone="danger"
                successMessage={`${s.enrollmentNo} marked failed.`}
                onConfirm={async () => {
                  const fd = new FormData();
                  fd.set("id", s.id);
                  fd.set("failed", "true");
                  await setStudentFailed(fd);
                  router.refresh();
                }}
              >
                <UserRoundX className="size-4" />
              </ConfirmButton>
            )}
            {s.status === "FAILED" && (
              <ConfirmButton
                buttonTitle="Restore to in training"
                className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-success/10 hover:text-success"
                title={`Restore ${s.name}?`}
                description="Returns the student to In Training in their original batch."
                confirmLabel="Restore"
                tone="primary"
                successMessage={`${s.enrollmentNo} restored.`}
                onConfirm={async () => {
                  const fd = new FormData();
                  fd.set("id", s.id);
                  fd.set("failed", "false");
                  await setStudentFailed(fd);
                  router.refresh();
                }}
              >
                <Undo2 className="size-4" />
              </ConfirmButton>
            )}
            <ConfirmButton
              buttonTitle="Delete"
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
              title={`Delete ${s.name}?`}
              description="This permanently deletes the student record. This cannot be undone."
              successMessage={`Deleted ${s.enrollmentNo}.`}
              onConfirm={async () => {
                const fd = new FormData();
                fd.set("id", s.id);
                await deleteStudent(fd);
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
    <>
      <PromoteStudentDialog
        open={promoting !== null}
        onOpenChange={(v) => {
          if (!v) setPromoting(null);
        }}
        student={promoting}
        onSuccess={handlePromoteSuccess}
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        enableRowSelection
        selectionToolbar={(selectedRows, clearSelection) => {
          const restoreMode = scope === "FAILED";
          return (
            <>
              <ConfirmButton
                buttonTitle={restoreMode ? "Bulk restore" : "Bulk mark failed"}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
                title={`${restoreMode ? "Restore" : "Mark failed"} ${selectedRows.length} selected student${selectedRows.length === 1 ? "" : "s"}?`}
                description={
                  restoreMode
                    ? "Returns the selected students to In Training in their original batches."
                    : "Failed students leave the default list, can never be promoted, and stay on record."
                }
                confirmLabel={restoreMode ? "Restore" : "Mark failed"}
                tone={restoreMode ? "primary" : "danger"}
                successMessage={`${restoreMode ? "Restored" : "Marked failed"} ${selectedRows.length} student${selectedRows.length === 1 ? "" : "s"}.`}
                onConfirm={async () => {
                  await bulkFailed(selectedRows, !restoreMode);
                  clearSelection();
                }}
              >
                {restoreMode ? (
                  <Undo2 aria-hidden />
                ) : (
                  <UserRoundX aria-hidden />
                )}
                {restoreMode ? "Restore" : "Failed"}
              </ConfirmButton>
              <ConfirmButton
                buttonTitle="Bulk delete"
                className={cn(
                  buttonVariants({ variant: "destructive", size: "sm" }),
                )}
                title={`Delete ${selectedRows.length} selected student${selectedRows.length === 1 ? "" : "s"}?`}
                description="This permanently deletes the selected student records. This cannot be undone."
                successMessage={`Deleted ${selectedRows.length} student${selectedRows.length === 1 ? "" : "s"}.`}
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
        noun="student"
        searchPlaceholder="Search name, enrollment number, or batch…"
        globalFilterFn={searchFilter}
        toolbar={
          <nav
            aria-label="Student status"
            className="flex h-11 items-center gap-1 rounded-md border border-outline-variant/60 bg-card p-1 text-xs font-semibold dark:border-white/[0.08]"
          >
            {SCOPES.map((tab) => {
              const active = scope === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={`/dashboard/students?status=${tab.value}`}
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
          enrollmentNo: "Student No.",
          batchCode: "Batch",
          status: "Status",
          total: "Total",
        }}
        initialVisibility={{ enrollmentNo: false }}
        columnWidths={{
          photo: 56,
          name: 220,
          enrollmentNo: 140,
          batchCode: 110,
          status: 150,
          total: 90,
          actions: 130,
        }}
      />
    </>
  );
}
