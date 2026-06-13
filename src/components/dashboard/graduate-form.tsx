"use client";

import { Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import type { ActionState } from "@/app/dashboard/graduates/actions";
import { deleteGraduate } from "@/app/dashboard/graduates/actions";
import { BatchSelect } from "@/components/dashboard/batch-select";
import { ConfirmDialog } from "@/components/dashboard/confirm-button";
import { GradeCells } from "@/components/dashboard/grade-cells";
import { PrivateContactFields } from "@/components/dashboard/private-contact-fields";
import { SchemeGradeEntry } from "@/components/dashboard/scheme-grade-entry";
import {
  type PhotoStaging,
  type SaveState,
  StudentPhotoPanel,
} from "@/components/dashboard/student-photo-panel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import type { GradingScheme } from "@/lib/assessment-scheme";
import { scoreRowsFor } from "@/lib/graduate";

export type GraduateDefaults = {
  lcn?: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  phone?: string;
  gender?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  district?: string;
  town?: string;
  country?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  mapsUrl?: string;
  batchCode?: string;
  status?: string;
  legacy?: boolean;
  issuedRaw?: string;
  expirationRaw?: string;
  registrationRaw?: string;
  scoreFWE?: string;
  scoreSJE?: string;
  scoreEP?: string;
  scorePAS?: string;
  scoreCCST?: string;
  scoreCCSM?: string;
  bonusPoints?: string;
  ranking?: string;
  notes?: string;
  photoUrl?: string | null;
  proficiencyRows?: unknown;
};

const SCORE_FIELDS = [
  "scoreFWE",
  "scoreSJE",
  "scoreEP",
  "scorePAS",
  "scoreCCST",
  "scoreCCSM",
] as const satisfies readonly (keyof GraduateDefaults)[];

type ScoreField = (typeof SCORE_FIELDS)[number];

function Labeled({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the form control is passed in via children
    <label className={className ? `block ${className}` : "block"}>
      <span className="mb-1 block text-sm font-medium text-on-surface">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
    </label>
  );
}

export function GraduateForm({
  action,
  defaults = {},
  submitLabel,
  successMessage = "Record saved.",
  redirectTo = "/dashboard/graduates",
  lockLcn = false,
  deleteId,
  validityYears = 1,
  scheme = null,
  granularDefaults = {},
  bonusNote = "",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: GraduateDefaults;
  submitLabel: string;
  successMessage?: string;
  redirectTo?: string;
  lockLcn?: boolean;
  deleteId?: string;
  /** Org expiry policy: validity period shown in the expiration hint. */
  validityYears?: number;
  /**
   * Batch grading scheme + linked-student raw scores: when present, grades
   * are edited granularly per assessment (the six columns and bonus are
   * recomputed server-side through the scheme) instead of entered directly.
   */
  scheme?: GradingScheme | null;
  granularDefaults?: Record<string, string>;
  bonusNote?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  const handled = useRef(false);
  const fe = state.fieldErrors ?? {};
  const [delPending, startDelete] = useTransition();
  // Confirm-before-apply: submits (button or Enter key) first pass through
  // the save dialog; `confirmedRef` lets the re-dispatched submit proceed.
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isEdit = Boolean(deleteId);
  const [batchCode, setBatchCode] = useState(defaults.batchCode ?? "");
  const [batchProficiencyRows, setBatchProficiencyRows] = useState(
    defaults.proficiencyRows,
  );
  const scoreRows = useMemo(
    () => scoreRowsFor(batchCode, batchProficiencyRows),
    [batchCode, batchProficiencyRows],
  );

  const [scores, setScores] = useState<Record<ScoreField, string>>(
    () =>
      Object.fromEntries(
        SCORE_FIELDS.map((field) => [
          field,
          (defaults[field] as string | undefined) ?? "",
        ]),
      ) as Record<ScoreField, string>,
  );
  const [bonusPoints, setBonusPoints] = useState(defaults.bonusPoints ?? "");
  const total = useMemo(() => {
    // Scores are entered as already-weighted points (FWE ≤10 … CCSM ≤25); the
    // Total Evaluation is their sum plus the signed bonus line.
    let sum = 0;
    for (const row of scoreRows) {
      const field = row.key as ScoreField;
      const v = Number.parseFloat(scores[field]);
      if (!Number.isNaN(v)) sum += v;
    }
    const bonus = Number.parseFloat(bonusPoints);
    if (!Number.isNaN(bonus)) sum += bonus;
    return sum;
  }, [scoreRows, scores, bonusPoints]);

  const saveState: SaveState = pending ? "saving" : state.ok ? "done" : "idle";

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      toast.success(successMessage);
      router.push(redirectTo);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router, successMessage, redirectTo]);

  // Photo staging gate: saving while the scan/upload pipeline is in flight
  // (or after it failed) would silently persist the record without its photo.
  const [photoStaging, setPhotoStaging] = useState<PhotoStaging>("idle");

  function onSubmitIntercept(e: React.FormEvent<HTMLFormElement>) {
    if (photoStaging === "busy") {
      e.preventDefault();
      toast.message("Photo is still uploading — save once it finishes.");
      return;
    }
    if (photoStaging === "failed") {
      e.preventDefault();
      toast.error(
        "The photo didn't attach. Retry the upload or remove the photo first.",
      );
      return;
    }
    if (!confirmedRef.current) {
      e.preventDefault();
      setSaveOpen(true);
      return;
    }
    confirmedRef.current = false;
  }

  function confirmSave() {
    setSaveOpen(false);
    confirmedRef.current = true;
    formRef.current?.requestSubmit();
  }

  function confirmDelete() {
    if (!deleteId) return;
    const fd = new FormData();
    fd.set("id", deleteId);
    startDelete(async () => {
      await deleteGraduate(fd);
      toast.success("Record deleted.");
      router.push("/dashboard/graduates");
      router.refresh();
    });
    setDeleteOpen(false);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmitIntercept}
      className="mx-auto w-full max-w-6xl"
    >
      <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)]">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-accent">
            <UserRound className="size-5" aria-hidden />
            <span>Emergency Medical Technician</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending || delPending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
            {deleteId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={delPending || pending}
                onClick={() => setDeleteOpen(true)}
                className="border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20"
              >
                <Trash2 aria-hidden /> Delete
              </Button>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          onConfirm={confirmSave}
          title={
            isEdit
              ? `Apply changes to ${defaults.lcn ?? "this record"}?`
              : "Create this record?"
          }
          description={
            isEdit
              ? "Saves these edits to the official record — the public credential and printable artifacts update immediately."
              : "Adds this record to the official registry."
          }
          confirmLabel={submitLabel}
          tone="primary"
          pending={pending}
        />
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={confirmDelete}
          title={`Delete record ${defaults.lcn ?? ""}?`}
          description="Permanently removes this record and its public credential. This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          pending={delPending}
        />

        <div className="flex flex-col border-outline-variant/60 border-t md:flex-row">
          {/* Left: photo + live integration cards */}
          <div className="border-outline-variant/60 p-5 md:w-1/3 md:border-r">
            <StudentPhotoPanel
              currentUrl={defaults.photoUrl}
              saveState={saveState}
              persisted={Boolean(deleteId)}
              onStagingChange={setPhotoStaging}
            />
          </div>

          {/* Right: profile + scores */}
          <div className="space-y-6 p-5 md:w-2/3">
            <h2 className="font-semibold text-on-surface">
              Profile Information
            </h2>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Labeled label="License Number" required={!lockLcn}>
                <Input
                  name="lcn"
                  defaultValue={defaults.lcn}
                  readOnly={lockLcn}
                  placeholder="A05-210801"
                  aria-invalid={fe.lcn ? true : undefined}
                  className={
                    lockLcn
                      ? "bg-surface-low text-on-surface-variant"
                      : undefined
                  }
                />
                {lockLcn ? (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    LC Number cannot be changed
                  </p>
                ) : (
                  fe.lcn && <p className="mt-1 text-xs text-error">{fe.lcn}</p>
                )}
              </Labeled>

              <Labeled label="Batch">
                <BatchSelect
                  name="batchCode"
                  defaultValue={defaults.batchCode}
                  onValueChange={(code, batch) => {
                    setBatchCode(code);
                    setBatchProficiencyRows(batch?.proficiencyRows ?? null);
                  }}
                />
              </Labeled>

              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:col-span-2 sm:grid-cols-4">
                <Labeled label="First" required>
                  <Input
                    name="firstName"
                    defaultValue={defaults.firstName}
                    placeholder="First name"
                    aria-invalid={fe.firstName ? true : undefined}
                  />
                </Labeled>
                <Labeled label="Middle">
                  <Input
                    name="middleName"
                    defaultValue={defaults.middleName}
                    placeholder="Middle name"
                  />
                </Labeled>
                <Labeled label="Last" required>
                  <Input
                    name="lastName"
                    defaultValue={defaults.lastName}
                    placeholder="Last name"
                    aria-invalid={fe.lastName ? true : undefined}
                  />
                </Labeled>
                <Labeled label="Suffix">
                  <Input
                    name="suffix"
                    defaultValue={defaults.suffix}
                    placeholder="Jr., Sr., III"
                  />
                </Labeled>
              </div>

              <PrivateContactFields defaults={defaults} />

              <Labeled label="Date of Issuance">
                <DatePicker
                  name="issuedRaw"
                  defaultValue={defaults.issuedRaw}
                  placeholder="Aug 03, 2021 · today · last monday"
                />
              </Labeled>
              <Labeled label="Date of Expiration">
                <DatePicker
                  name="expirationRaw"
                  defaultValue={defaults.expirationRaw}
                  placeholder={`Aug 03, 2026 · in ${validityYears} year${validityYears === 1 ? "" : "s"}`}
                />
              </Labeled>
              <Labeled
                label="Latest Re-Certification"
                className="sm:col-span-2"
              >
                <DatePicker
                  name="registrationRaw"
                  defaultValue={defaults.registrationRaw}
                  placeholder="Aug 03, 2021 · 2 weeks ago"
                />
              </Labeled>

              {/* Status is set by the section (students vs graduates), not edited
                  here. Legacy and ranking are computed automatically. */}
              <input
                type="hidden"
                name="status"
                value={defaults.status ?? "GRADUATE"}
              />
            </div>

            {/* Proficiency record: granular per-assessment entry when the
                batch has a grading scheme and a linked student record; direct
                six-column entry otherwise (legacy/manual records). */}
            <div>
              <h2 className="mb-2 font-semibold text-on-surface">
                Over-All Proficiency Evaluation Record
              </h2>
              {scheme ? (
                <>
                  <p className="mb-3 text-xs text-on-surface-variant">
                    Scores are entered per assessment (raw points) and graded
                    through the batch&apos;s assessment scheme — the six
                    proficiency columns, bonus line, and Total Evaluation are
                    recomputed on save.
                  </p>
                  <SchemeGradeEntry
                    scheme={scheme}
                    defaults={granularDefaults}
                    defaultBonus={defaults.bonusPoints ?? ""}
                    defaultBonusNote={bonusNote}
                  />
                </>
              ) : (
                <div className="overflow-hidden rounded-md border border-outline-variant/60">
                  <table className="w-full text-left text-xs text-on-surface">
                    <thead className="bg-surface-container">
                      <tr>
                        <th className="w-20 border-outline-variant/60 border-b px-3 py-2 font-semibold">
                          Total %
                        </th>
                        <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold">
                          Examination
                        </th>
                        <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreRows.map((row) => {
                        const field = row.key as ScoreField;
                        return (
                          <tr key={field} className="even:bg-surface-low">
                            <td className="border-outline-variant/60 border-r px-3 py-2">
                              {row.weight}
                            </td>
                            <td className="border-outline-variant/60 border-r px-3 py-2">
                              {row.label}
                            </td>
                            <td className="px-3 py-2">
                              <GradeCells
                                name={field}
                                defaultValue={defaults[field]}
                                onValue={(v) =>
                                  setScores((s) => ({ ...s, [field]: v }))
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="even:bg-surface-low">
                        <td className="border-outline-variant/60 border-r px-3 py-2 text-on-surface-variant">
                          —
                        </td>
                        <td className="border-outline-variant/60 border-r px-3 py-2">
                          Bonus points
                          <span className="ml-2 text-[10px] text-on-surface-variant">
                            signed; own line, not part of any category
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            name="bonusPoints"
                            type="number"
                            step="0.01"
                            value={bonusPoints}
                            onChange={(e) => setBonusPoints(e.target.value)}
                            placeholder="0"
                            className="h-8 w-28 font-mono text-xs"
                          />
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="border-outline-variant/60 border-t bg-surface-highest font-semibold">
                      <tr>
                        <th className="border-outline-variant/60 border-r px-3 py-2 text-left">
                          100%
                        </th>
                        <th className="border-outline-variant/60 border-r px-3 py-2 text-left">
                          Total Evaluation
                        </th>
                        <th className="px-3 py-2 text-left">
                          {Math.round(total * 100) / 100}%
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <p className="text-xs text-on-surface-variant">
              Ranking is computed automatically from the total score (per batch
              and globally). Legacy status applies automatically to Batch 5
              only; Batch 11 and 16 records are archived (records only).
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
