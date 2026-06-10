"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Eye, GraduationCap, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { deleteStudent } from "@/app/dashboard/students/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { PromoteStudentDialog } from "@/components/dashboard/promote-student-dialog";
import type { StudentRow } from "@/components/dashboard/students-table";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  FilterHeader,
  SortableHeader,
} from "@/components/ui/data-table";

const STATUS: Record<
  StudentRow["status"],
  { variant: "primary" | "verified" | "neutral"; label: string }
> = {
  IN_TRAINING: { variant: "primary", label: "In training" },
  GRADUATED: { variant: "verified", label: "Graduated" },
  WITHDRAWN: { variant: "neutral", label: "Withdrawn" },
};

const STATUS_OPTIONS = [
  { value: "IN_TRAINING", label: "In training" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

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

export function StudentsDataTable({ rows }: { rows: StudentRow[] }) {
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

  const columns: ColumnDef<StudentRow, unknown>[] = [
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
      accessorKey: "enrollmentNo",
      header: ({ column }) => (
        <SortableHeader column={column} label="Enrollment" />
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
        noun="student"
        searchPlaceholder="Search name, enrollment number, or batch…"
        globalFilterFn={searchFilter}
        columnLabels={{
          name: "Name",
          enrollmentNo: "Enrollment",
          batchCode: "Batch",
          status: "Status",
          total: "Total",
        }}
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
