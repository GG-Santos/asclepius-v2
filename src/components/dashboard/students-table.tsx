"use client";

import { Eye, GraduationCap, Pencil, Trash2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteStudent } from "@/app/dashboard/students/actions";
import { PromoteStudentDialog } from "@/components/dashboard/promote-student-dialog";
import { Badge } from "@/components/ui/badge";

export type StudentRow = {
  id: string;
  enrollmentNo: string;
  name: string;
  batchCode: string | null;
  status: "IN_TRAINING" | "GRADUATED" | "WITHDRAWN";
  graduatedToLcn: string | null;
  total: number | null;
  photoUrl: string | null;
};

const STATUS: Record<
  StudentRow["status"],
  { variant: "primary" | "verified" | "neutral"; label: string }
> = {
  IN_TRAINING: { variant: "primary", label: "In training" },
  GRADUATED: { variant: "verified", label: "Graduated" },
  WITHDRAWN: { variant: "neutral", label: "Withdrawn" },
};

export function StudentsTable({
  rows,
  emptyMessage = "No students found.",
}: {
  rows: StudentRow[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [promoting, setPromoting] = useState<StudentRow | null>(null);

  function remove(s: StudentRow) {
    if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    const fd = new FormData();
    fd.set("id", s.id);
    startTransition(async () => {
      await deleteStudent(fd);
      toast.success(`Deleted ${s.enrollmentNo}.`);
      router.refresh();
    });
  }

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

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-outline-variant/60 bg-card px-6 py-14 text-center">
        <Users className="size-8 text-on-surface-variant/30" aria-hidden />
        <p className="text-sm text-on-surface-variant">{emptyMessage}</p>
      </div>
    );
  }

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
      <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-primary text-on-primary">
              <th className="px-3 py-2 text-left font-semibold">Photo</th>
              <th className="px-3 py-2 text-left font-semibold">Name</th>
              <th className="px-3 py-2 text-left font-semibold">Enrollment</th>
              <th className="px-3 py-2 text-left font-semibold">Batch</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-left font-semibold">Total</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const st = STATUS[s.status];
              return (
                <tr
                  key={s.id}
                  className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low hover:bg-surface-container transition-colors"
                >
                  <td className="px-3 py-2">
                    {s.photoUrl ? (
                      <Image
                        src={s.photoUrl}
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
                    {s.name}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {s.enrollmentNo}
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {s.batchCode ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {s.graduatedToLcn && (
                      <span className="ml-2 font-mono text-[10px] text-on-surface-variant">
                        {s.graduatedToLcn}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {s.total === null ? "—" : `${s.total}%`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
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
                          disabled={pending}
                          onClick={() => setPromoting(s)}
                          title="Graduate (issue license)"
                          className="rounded p-1.5 text-on-surface-variant hover:bg-success/10 hover:text-success disabled:opacity-50"
                        >
                          <GraduationCap className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(s)}
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
    </>
  );
}
