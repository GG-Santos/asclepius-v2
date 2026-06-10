"use client";

import { Pencil, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  dismissGraduationRequest,
  requestGraduation,
  updateBatch,
} from "@/app/dashboard/batches/actions";
import { BatchGraduationDialog } from "@/components/dashboard/batch-graduation-dialog";
import { BatchLogoPanel } from "@/components/dashboard/batch-logo-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type BatchGrades, VERDICT_LABEL, type Verdict } from "@/lib/grading";
import type { VerificationState } from "@/lib/graduate";
import { cn } from "@/lib/utils";

export type BatchStatus = "training" | "partial" | "graduated" | "empty";

type InTrainingMember = {
  id: string;
  name: string;
  enrollmentNo: string;
  photoUrl: string | null;
  total: number | null;
  verdict: Verdict;
  rank: number | null;
};

type GraduateMember = {
  id: string;
  lcn: string;
  name: string;
  photoUrl: string | null;
  total: number | null;
  rank: number | null;
  medal: string | null;
  expirationRaw: string | null;
  state: VerificationState;
};

type BatchData = {
  id: string;
  code: string;
  label: string | null;
  professor: string | null;
  professorId: string | null;
  description: string | null;
  logoUrl: string | null;
  graduated: boolean;
  graduationRequested: boolean;
  graduatedAtLabel: string | null;
};

const STATUS_PILL: Record<BatchStatus, { label: string; cls: string }> = {
  training: { label: "In training", cls: "bg-primary/10 text-primary" },
  partial: { label: "Partially graduated", cls: "bg-warning/10 text-warning" },
  graduated: { label: "Graduated", cls: "bg-success/10 text-success" },
  empty: {
    label: "No members",
    cls: "bg-surface-container text-on-surface-variant",
  },
};

const VERDICT_BADGE: Record<Verdict, "verified" | "expired" | "neutral"> = {
  pass: "verified",
  fail: "expired",
  incomplete: "neutral",
};

const GRAD_STATE: Record<
  VerificationState,
  { variant: "verified" | "expired" | "neutral"; label: string }
> = {
  verified: { variant: "verified", label: "Active" },
  expired: { variant: "expired", label: "Expired" },
  archived: { variant: "neutral", label: "Archived" },
};

function Avatar({
  url,
  w = 28,
  h = 35,
}: {
  url: string | null;
  w?: number;
  h?: number;
}) {
  return url ? (
    <Image
      src={url}
      alt=""
      width={w}
      height={h}
      className="shrink-0 rounded object-cover"
      style={{ width: w, height: h }}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded bg-surface-highest text-[10px] text-on-surface-variant"
      style={{ width: w, height: h }}
    >
      —
    </div>
  );
}

export function BatchDetailClient({
  batch,
  professors,
  canManage,
  status,
  inTraining,
  graduates,
  summary,
}: {
  batch: BatchData;
  professors: { id: string; name: string }[];
  canManage: boolean;
  status: BatchStatus;
  inTraining: InTrainingMember[];
  graduates: GraduateMember[];
  summary: BatchGrades;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pill = STATUS_PILL[status];

  const gActive = graduates.filter((m) => m.state === "verified").length;
  const gExpired = graduates.filter((m) => m.state === "expired").length;
  const gArchived = graduates.filter((m) => m.state === "archived").length;

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

  function requestGrad() {
    const fd = new FormData();
    fd.set("id", batch.id);
    startTransition(async () => {
      const res = await requestGraduation(fd);
      if (res?.ok) {
        toast.success("Graduation review requested.");
        router.refresh();
      } else {
        toast.error(res?.error ?? "Could not request graduation.");
      }
    });
  }

  function dismissReq() {
    const fd = new FormData();
    fd.set("id", batch.id);
    startTransition(async () => {
      await dismissGraduationRequest(fd);
      toast.success("Request dismissed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            pill.cls,
          )}
        >
          {pill.label}
        </span>
        {batch.graduated && batch.graduatedAtLabel && (
          <span className="text-sm text-on-surface-variant">
            Graduated {batch.graduatedAtLabel}
          </span>
        )}
      </div>

      {!canManage && (
        <p className="rounded-lg border border-outline-variant/60 bg-surface-low px-4 py-2.5 text-sm text-on-surface-variant">
          You&apos;re viewing this batch as its professor. Settings and
          graduation are handled by an administrator.
        </p>
      )}

      {/* Professor: request graduation review (admin approves) */}
      {!canManage && !batch.graduated && (
        <section className="rounded-xl border border-outline-variant/60 bg-card p-5 shadow-[var(--shadow-clinical)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-on-surface">
                Graduation
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {batch.graduationRequested
                  ? "Review requested — pending an administrator's approval."
                  : "When this cohort is ready, ask an administrator to review and graduate it."}
              </p>
            </div>
            {batch.graduationRequested ? (
              <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                Pending review
              </span>
            ) : (
              <Button size="sm" onClick={requestGrad} disabled={pending}>
                {pending ? "Requesting…" : "Request graduation"}
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Batch settings — admin only */}
      {canManage && (
        <section className="overflow-hidden rounded-xl border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 p-5 md:flex-row"
          >
            <input type="hidden" name="id" value={batch.id} />
            <div className="shrink-0 md:w-48">
              <BatchLogoPanel currentUrl={batch.logoUrl} />
            </div>
            <div className="flex flex-1 flex-col gap-4">
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
                  <Label htmlFor="label">Batch name</Label>
                  <Input
                    id="label"
                    name="label"
                    defaultValue={batch.label ?? ""}
                    placeholder="e.g. 2025 cohort"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="professorId">Professor account</Label>
                  <select
                    id="professorId"
                    name="professorId"
                    defaultValue={batch.professorId ?? ""}
                    className="h-11 rounded border border-outline-variant bg-card px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="">— Unassigned —</option>
                    {professors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="professor">Display name</Label>
                  <Input
                    id="professor"
                    name="professor"
                    defaultValue={batch.professor ?? ""}
                    placeholder="e.g. Wilky S. Lao"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="description">Public description</Label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={batch.description ?? ""}
                    rows={3}
                    placeholder="Shown on the public cohort page (/cohorts)…"
                    className="rounded-md border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* Graduation — admin only */}
      {canManage && !batch.graduated && inTraining.length > 0 && (
        <section className="rounded-xl border border-outline-variant/60 bg-card p-5 shadow-[var(--shadow-clinical)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-on-surface">
                Projected graduation
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {summary.passed} of {summary.graded || 0} assessed would pass
                (≥70%)
                {summary.incomplete > 0
                  ? ` · ${summary.incomplete} still need scores`
                  : ""}
                .
              </p>
            </div>
            <div className="flex items-center gap-2">
              {batch.graduationRequested && (
                <>
                  <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                    Review requested
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissReq}
                    disabled={pending}
                  >
                    Dismiss
                  </Button>
                </>
              )}
              <BatchGraduationDialog
                batchId={batch.id}
                batchName={batch.label || batch.code}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat
              label="Would pass"
              value={summary.passed}
              cls="text-success"
            />
            <Stat
              label="Would fail"
              value={summary.failed}
              cls="text-secondary"
            />
            <Stat
              label="No scores"
              value={summary.incomplete}
              cls="text-warning"
            />
          </div>
        </section>
      )}

      {/* In-training members */}
      {inTraining.length > 0 && (
        <Roster title={`In training (${inTraining.length})`}>
          {inTraining.map((m) => (
            <tr
              key={m.id}
              className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low"
            >
              <td className="px-3 py-2 tabular text-on-surface-variant">
                {m.rank != null ? `#${m.rank}` : "—"}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar url={m.photoUrl} />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-on-surface">
                      {m.name}
                    </div>
                    <div className="tabular text-xs text-on-surface-variant">
                      {m.enrollmentNo}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular font-semibold text-on-surface">
                {m.total != null ? `${m.total}%` : "—"}
              </td>
              <td className="px-3 py-2">
                <Badge variant={VERDICT_BADGE[m.verdict]}>
                  {VERDICT_LABEL[m.verdict]}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/dashboard/students/${m.id}/edit`}
                  title="Edit student"
                  className="inline-flex rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                >
                  <Pencil className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </Roster>
      )}

      {/* Graduates */}
      {graduates.length > 0 && (
        <Roster
          title={`Graduates (${graduates.length})`}
          meta={
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                {gActive} active
              </span>
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 font-medium text-secondary">
                {gExpired} expired
              </span>
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-medium text-on-surface-variant">
                {gArchived} archived
              </span>
            </div>
          }
          licensed
        >
          {graduates.map((m) => (
            <tr
              key={m.id}
              className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low"
            >
              <td className="px-3 py-2 tabular whitespace-nowrap font-medium text-on-surface-variant">
                {m.medal ? <span className="mr-1">{m.medal}</span> : null}
                {m.rank != null ? `#${m.rank}` : "—"}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar url={m.photoUrl} />
                  <div className="truncate font-medium text-on-surface">
                    {m.name}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 tabular text-xs text-on-surface-variant">
                {m.lcn}
              </td>
              <td className="px-3 py-2 text-right tabular font-semibold text-on-surface">
                {m.total != null ? `${m.total}%` : "—"}
              </td>
              <td className="px-3 py-2">
                <Badge variant={GRAD_STATE[m.state].variant}>
                  {GRAD_STATE[m.state].label}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/dashboard/graduates/${m.id}`}
                  title="View graduate"
                  className="inline-flex rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                >
                  <Pencil className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </Roster>
      )}

      {inTraining.length === 0 && graduates.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-outline-variant/60 bg-card px-6 py-14 text-center">
          <Users className="size-8 text-on-surface-variant/30" aria-hidden />
          <p className="text-sm text-on-surface-variant">
            No students or graduates in this batch yet.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  cls,
}: {
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/50 bg-surface-low p-3">
      <p className={cn("tabular text-2xl font-bold", cls)}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
        {label}
      </p>
    </div>
  );
}

function Roster({
  title,
  meta,
  licensed,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  licensed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="border-l-2 border-accent pl-2 font-semibold text-on-surface">
          {title}
        </h2>
        {meta}
      </div>
      <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container text-on-surface dark:border-white/[0.06]">
              <th className="px-3 py-2 text-left font-semibold">Rank</th>
              <th className="px-3 py-2 text-left font-semibold">
                {licensed ? "Graduate" : "Student"}
              </th>
              {licensed ? (
                <>
                  <th className="px-3 py-2 text-left font-semibold">License</th>
                  <th className="px-3 py-2 text-right font-semibold">Score</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-right font-semibold">Score</th>
                  <th className="px-3 py-2 text-left font-semibold">Result</th>
                </>
              )}
              <th className="px-3 py-2 text-right font-semibold" />
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
