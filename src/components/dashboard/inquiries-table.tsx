"use client";

import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Mail, MailCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  deleteInquiry,
  markInquiryReplied,
  setInquiryStatus,
} from "@/app/dashboard/inquiries/actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import {
  DataTable,
  FilterHeader,
  SortableHeader,
} from "@/components/ui/data-table";

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  program: string | null;
  message: string | null;
  status: "NEW" | "CONTACTED" | "CLOSED";
  repliedAt: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<InquiryRow["status"], string> = {
  NEW: "bg-accent/10 text-accent",
  CONTACTED: "bg-warning/10 text-warning",
  CLOSED: "bg-success/10 text-success",
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CLOSED", label: "Closed" },
];

const setFilter: FilterFn<InquiryRow> = (row, id, value) => {
  const set = value as string[] | undefined;
  if (!set?.length) return true;
  return set.includes(String(row.getValue(id)));
};

const searchFilter: FilterFn<InquiryRow> = (row, _id, value) => {
  const q = String(value).toLowerCase();
  const r = row.original;
  return (
    r.name.toLowerCase().includes(q) ||
    r.email.toLowerCase().includes(q) ||
    (r.phone ?? "").toLowerCase().includes(q) ||
    (r.program ?? "").toLowerCase().includes(q)
  );
};

function replyBody(r: InquiryRow): string {
  return `Hi ${r.name.split(" ")[0] || r.name},

Thank you for your interest in WSL EMS training${r.program ? ` — specifically our ${r.program} program` : ""}. We'd be glad to help you get started.

Here are the next steps:
• Program schedule and tuition details are attached/below.
• To reserve a slot, reply to this email or call us.

If you have any questions, just reply here.

Warm regards,
WSL EMS Admissions`;
}

export function InquiriesTable({ rows }: { rows: InquiryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(row: InquiryRow, status: InquiryRow["status"]) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("status", status);
    startTransition(async () => {
      await setInquiryStatus(fd);
      router.refresh();
    });
  }

  function reply(row: InquiryRow) {
    const subject = encodeURIComponent("Your WSL EMS training inquiry");
    const body = encodeURIComponent(replyBody(row));
    window.open(
      `mailto:${row.email}?subject=${subject}&body=${body}`,
      "_blank",
    );
    const fd = new FormData();
    fd.set("id", row.id);
    startTransition(async () => {
      await markInquiryReplied(fd);
      toast.success(`Reply drafted to ${row.email}.`);
      router.refresh();
    });
  }

  const programOptions = [
    ...new Set(rows.map((r) => r.program).filter((p): p is string => !!p)),
  ]
    .sort()
    .map((p) => ({ value: p, label: p }));

  const columns: ColumnDef<InquiryRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (r) => r.name,
      enableHiding: false,
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="min-w-0">
            <Link
              href={`/dashboard/inquiries/${r.id}`}
              className="font-medium text-on-surface hover:text-accent"
            >
              {r.name}
            </Link>
            {r.message && (
              <p className="mt-0.5 line-clamp-2 max-w-xs text-xs text-on-surface-variant">
                {r.message}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "contact",
      accessorFn: (r) => r.email,
      header: () => (
        <span className="font-semibold text-on-surface">Contact</span>
      ),
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="text-on-surface-variant">
            <a href={`mailto:${r.email}`} className="hover:text-accent">
              {r.email}
            </a>
            {r.phone && <p className="text-xs">{r.phone}</p>}
          </div>
        );
      },
    },
    {
      id: "program",
      accessorFn: (r) => r.program ?? "—",
      header: ({ column }) =>
        programOptions.length > 0 ? (
          <FilterHeader
            column={column}
            label="Program"
            options={programOptions}
          />
        ) : (
          <span className="font-semibold text-on-surface">Program</span>
        ),
      filterFn: setFilter,
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.program ?? "—"}
        </span>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (r) => r.createdAt,
      header: ({ column }) => (
        <SortableHeader column={column} label="Received" />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-on-surface-variant">
          {new Date(row.original.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (r) => r.status,
      header: ({ column }) => (
        <FilterHeader column={column} label="Status" options={STATUS_OPTIONS} />
      ),
      filterFn: setFilter,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col gap-1">
            <select
              value={r.status}
              disabled={pending}
              onChange={(e) =>
                changeStatus(r, e.target.value as InquiryRow["status"])
              }
              className={`h-8 w-28 rounded-full border-0 px-2 text-xs font-semibold disabled:opacity-60 ${STATUS_STYLE[r.status]}`}
            >
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CLOSED">Closed</option>
            </select>
            {r.repliedAt && (
              <span className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant">
                <MailCheck className="size-3" />
                replied{" "}
                {new Date(r.repliedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => (
        <span className="font-semibold text-on-surface">Actions</span>
      ),
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => reply(r)}
              title="Draft reply email"
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-accent disabled:opacity-40"
            >
              <Mail className="size-4" />
            </button>
            <ConfirmButton
              buttonTitle="Delete"
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
              title={`Delete inquiry from ${r.name}?`}
              description="This permanently removes the inquiry. This cannot be undone."
              successMessage="Inquiry deleted."
              onConfirm={async () => {
                const fd = new FormData();
                fd.set("id", r.id);
                await deleteInquiry(fd);
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
      noun="inquiry"
      nounPlural="inquiries"
      searchPlaceholder="Search name, email, phone, or program…"
      globalFilterFn={searchFilter}
      columnLabels={{
        name: "Name",
        contact: "Contact",
        program: "Program",
        createdAt: "Received",
        status: "Status",
      }}
      columnWidths={{
        name: 280,
        contact: 200,
        program: 130,
        createdAt: 120,
        status: 150,
        actions: 90,
      }}
    />
  );
}
