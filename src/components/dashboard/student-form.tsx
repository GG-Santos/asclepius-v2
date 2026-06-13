"use client";

import { GraduationCap, Trash2, UserRound } from "lucide-react";
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
import {
  deleteStudent,
  type StudentActionState,
} from "@/app/dashboard/students/actions";
import { BatchSelect } from "@/components/dashboard/batch-select";
import { ConfirmDialog } from "@/components/dashboard/confirm-button";
import { PrivateContactFields } from "@/components/dashboard/private-contact-fields";
import { PromoteStudentDialog } from "@/components/dashboard/promote-student-dialog";
import { SchemeGradeEntry } from "@/components/dashboard/scheme-grade-entry";
import {
  type PhotoStaging,
  StudentPhotoPanel,
} from "@/components/dashboard/student-photo-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GradingScheme } from "@/lib/assessment-scheme";
import {
  computeQuizTotal,
  type GranularGrades,
  isPracticalPassing,
  isQuizPassing,
  PRACTICAL_DEFS,
  type PracticalKey,
  QUIZ_DEFS,
  type QuizDef,
  quizMaxTotal,
} from "@/lib/student-grades";

export type StudentDefaults = {
  enrollmentNo?: string;
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
  // Periodic quiz raw scores, keyed by positional qN (count follows the batch).
  quizGrades?: Record<string, string>;
  // Scheme batches: component-keyed raw scores + bonus (R2/R6).
  schemeGrades?: Record<string, string>;
  bonusPoints?: string;
  bonusNote?: string;
  // Practical exam raw scores
  scoreFWE?: string;
  scoreEP?: string;
  scorePAS?: string;
  scoreCCST?: string;
  scoreCCSM?: string;
  photoUrl?: string | null;
};

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
    // biome-ignore lint/a11y/noLabelWithoutControl: control passed via children
    <label className={className ? `block ${className}` : "block"}>
      <span className="mb-1 block text-sm font-medium text-on-surface">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {children}
    </label>
  );
}

function PassBadge({ pass, entered }: { pass: boolean; entered: boolean }) {
  if (!entered)
    return <span className="text-xs text-on-surface-variant">—</span>;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        pass ? "bg-success/15 text-success" : "bg-error/15 text-error"
      }`}
    >
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

export function StudentForm({
  action,
  defaults = {},
  submitLabel,
  successMessage = "Student saved.",
  redirectTo = "/dashboard/students",
  studentId,
  quizDefsByBatch = {},
  schemesByBatch = {},
}: {
  action: (
    prev: StudentActionState,
    formData: FormData,
  ) => Promise<StudentActionState>;
  defaults?: StudentDefaults;
  submitLabel: string;
  successMessage?: string;
  redirectTo?: string;
  studentId?: string;
  /** Custom quiz definitions per batch code; absent batches use legacy q1–q10. */
  quizDefsByBatch?: Record<string, QuizDef[]>;
  /** Full assessment schemes per batch code (supersede quiz defs — R11). */
  schemesByBatch?: Record<string, GradingScheme>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  const handled = useRef(false);
  const fe = state.fieldErrors ?? {};
  const [busy, startBusy] = useTransition();
  const [graduateOpen, setGraduateOpen] = useState(false);
  // Confirm-before-apply: submits (button or Enter key) first pass through
  // the save dialog; `confirmedRef` lets the re-dispatched submit proceed.
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Quiz definitions follow the SELECTED batch — switching batches re-keys
  // the table (positional qN values carry over where the keys overlap).
  const [batchCode, setBatchCode] = useState(defaults.batchCode ?? "");
  const activeScheme = schemesByBatch[batchCode] ?? null;
  const activeQuizDefs: readonly QuizDef[] =
    quizDefsByBatch[batchCode] ?? QUIZ_DEFS;

  // Controlled quiz score state for live pass/fail display
  const [quizScores, setQuizScores] = useState<Record<string, string>>(() => ({
    ...(defaults.quizGrades ?? {}),
  }));

  // Controlled practical score state
  const [practicalScores, setPracticalScores] = useState<
    Partial<Record<PracticalKey, string>>
  >(() => {
    const init: Partial<Record<PracticalKey, string>> = {};
    for (const def of PRACTICAL_DEFS) {
      init[def.key] =
        (defaults[def.key as keyof StudentDefaults] as string | undefined) ??
        "";
    }
    return init;
  });

  const { total: quizRawTotal, entered: quizEntered } = useMemo(() => {
    const grades: GranularGrades = {};
    for (const def of activeQuizDefs) {
      const v = Number.parseFloat(quizScores[def.key] ?? "");
      if (!Number.isNaN(v)) grades[def.key] = v;
    }
    return computeQuizTotal(grades, activeQuizDefs);
  }, [quizScores, activeQuizDefs]);
  const quizMax = quizMaxTotal(activeQuizDefs);

  const saveState = pending ? "saving" : state.ok ? "done" : "idle";

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
    if (!studentId) return;
    const fd = new FormData();
    fd.set("id", studentId);
    startBusy(async () => {
      await deleteStudent(fd);
      toast.success("Student deleted.");
      router.push("/dashboard/students");
      router.refresh();
    });
    setDeleteOpen(false);
  }

  function onGraduate() {
    if (!studentId) return;
    setGraduateOpen(true);
  }

  function handleGraduateSuccess(lcn: string) {
    toast.success(`Graduated — license ${lcn} issued.`, {
      action: {
        label: "View graduate",
        onClick: () =>
          router.push(`/dashboard/graduates?q=${encodeURIComponent(lcn)}`),
      },
    });
    router.push("/dashboard/graduates");
    router.refresh();
  }

  return (
    <>
      {studentId && (
        <PromoteStudentDialog
          open={graduateOpen}
          onOpenChange={setGraduateOpen}
          student={
            studentId
              ? {
                  id: studentId,
                  name:
                    [defaults.firstName, defaults.lastName]
                      .filter(Boolean)
                      .join(" ") || studentId,
                }
              : null
          }
          onSuccess={handleGraduateSuccess}
        />
      )}
      <ConfirmDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onConfirm={confirmSave}
        title={
          studentId ? "Apply changes to this student?" : "Create this student?"
        }
        description={
          studentId
            ? "Saves these edits to the student's training record."
            : "Adds this student to the training roster."
        }
        confirmLabel={submitLabel}
        tone="primary"
        pending={pending}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete this student?"
        description="Permanently removes the student and their training record. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        pending={busy}
      />
      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmitIntercept}
        className="mx-auto w-full max-w-6xl"
      >
        {/* Sticky action bar (R6): the save affordance stays visible at all
            times; section anchors jump straight to each concern. */}
        <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-card/95 px-4 py-3 shadow-[var(--shadow-clinical)] backdrop-blur dark:border-white/[0.08]">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-2 font-semibold text-accent">
              <UserRound className="size-5" aria-hidden />
              <span>EMT Trainee</span>
            </div>
            <nav
              aria-label="Form sections"
              className="hidden items-center gap-1 md:flex"
            >
              {[
                ["#student-photo", "Photo"],
                ["#student-profile", "Profile"],
                ["#student-quizzes", "Quizzes"],
                ["#student-practicals", "Practicals"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending || busy}>
              {pending ? "Saving…" : submitLabel}
            </Button>
            {studentId && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || pending}
                  onClick={onGraduate}
                  className="border-success/30 bg-success/10 text-success hover:bg-success/20"
                >
                  <GraduationCap aria-hidden /> Graduate
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || pending}
                  onClick={() => setDeleteOpen(true)}
                  className="border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20"
                >
                  <Trash2 aria-hidden /> Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)]">
          <div className="flex flex-col md:flex-row">
            <div
              id="student-photo"
              className="scroll-mt-24 border-outline-variant/60 p-5 md:w-1/3 md:border-r"
            >
              <h2 className="mb-3 border-l-2 border-accent pl-2 font-semibold text-on-surface">
                Photo
              </h2>
              <StudentPhotoPanel
                currentUrl={defaults.photoUrl}
                saveState={saveState}
                persisted={Boolean(studentId)}
                onStagingChange={setPhotoStaging}
              />
            </div>

            <div className="space-y-6 p-5 md:w-2/3">
              <h2
                id="student-profile"
                className="mb-2 scroll-mt-24 border-l-2 border-accent pl-2 font-semibold text-on-surface"
              >
                Profile Information
              </h2>

              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {defaults.enrollmentNo && (
                  <Labeled label="Enrollment Number">
                    <Input
                      value={defaults.enrollmentNo}
                      readOnly
                      className="bg-surface-low text-on-surface-variant"
                    />
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Auto-assigned. A License Number is issued at graduation.
                    </p>
                  </Labeled>
                )}
                <Labeled label="Batch">
                  <BatchSelect
                    name="batchCode"
                    defaultValue={defaults.batchCode}
                    onValueChange={setBatchCode}
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
                    {fe.firstName && (
                      <p className="mt-1 text-xs text-error">{fe.firstName}</p>
                    )}
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
                    {fe.lastName && (
                      <p className="mt-1 text-xs text-error">{fe.lastName}</p>
                    )}
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
              </div>

              {activeScheme ? (
                /* Scheme-driven entry replaces BOTH legacy sections (R8). */
                <div id="student-quizzes" className="scroll-mt-24">
                  <h2 className="mb-1 border-l-2 border-accent pl-2 font-semibold text-on-surface">
                    Assessments
                  </h2>
                  <p className="mb-3 text-xs text-on-surface-variant">
                    This batch grades through its own assessment scheme
                    {activeScheme.mode === "total-points"
                      ? " (total points)"
                      : " (weighted categories)"}
                    . Enter raw scores per component.
                  </p>
                  <SchemeGradeEntry
                    scheme={activeScheme}
                    defaults={defaults.schemeGrades ?? {}}
                    defaultBonus={defaults.bonusPoints ?? ""}
                    defaultBonusNote={defaults.bonusNote ?? ""}
                  />
                </div>
              ) : (
                <>
                  {/* Periodic Examinations */}
                  <div id="student-quizzes" className="scroll-mt-24">
                    <h2 className="mb-1 border-l-2 border-accent pl-2 font-semibold text-on-surface">
                      Periodic Examinations
                    </h2>
                    <p className="mb-3 text-xs text-on-surface-variant">
                      Enter raw scores. Running total feeds the SJE score on
                      graduation.
                    </p>
                    <div className="overflow-hidden rounded-md border border-outline-variant/60">
                      <table className="w-full text-left text-xs text-on-surface">
                        <thead className="bg-surface-container">
                          <tr>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold">
                              Quiz
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold">
                              Topics
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Max
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Pass
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Score
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeQuizDefs.map((def) => {
                            const raw = quizScores[def.key] ?? "";
                            const num = Number.parseFloat(raw);
                            const entered = raw !== "" && !Number.isNaN(num);
                            const pass =
                              entered &&
                              isQuizPassing(def.key, num, activeQuizDefs);
                            return (
                              <tr key={def.key} className="even:bg-surface-low">
                                <td className="border-outline-variant/60 border-r px-3 py-2 font-medium">
                                  {def.label}
                                </td>
                                <td className="border-outline-variant/60 border-r px-3 py-2 text-on-surface-variant">
                                  {def.topics}
                                </td>
                                <td className="border-outline-variant/60 border-r px-3 py-2 text-center font-mono">
                                  {def.maxScore}
                                </td>
                                <td className="border-outline-variant/60 border-r px-3 py-2 text-center font-mono">
                                  {def.passing}
                                </td>
                                <td className="border-outline-variant/60 border-r px-3 py-2 text-center">
                                  <input
                                    type="number"
                                    name={def.key}
                                    min={0}
                                    max={def.maxScore}
                                    step={1}
                                    value={raw}
                                    onChange={(e) =>
                                      setQuizScores((s) => ({
                                        ...s,
                                        [def.key]: e.target.value,
                                      }))
                                    }
                                    className="w-16 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="—"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <PassBadge pass={pass} entered={entered} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-outline-variant/60 border-t bg-surface-highest font-semibold">
                          <tr>
                            <td
                              colSpan={2}
                              className="border-outline-variant/60 border-r px-3 py-2"
                            >
                              Quiz Total
                            </td>
                            <td className="border-outline-variant/60 border-r px-3 py-2 text-center font-mono">
                              {quizMax}
                            </td>
                            <td className="border-outline-variant/60 border-r px-3 py-2 text-center font-mono">
                              {Math.round(quizMax / 2)}
                            </td>
                            <td className="border-outline-variant/60 border-r px-3 py-2 text-center font-mono">
                              {quizEntered > 0 ? quizRawTotal : "—"}
                            </td>
                            <td className="px-3 py-2 text-center text-on-surface-variant text-xs">
                              {quizEntered > 0
                                ? `${Math.round((quizRawTotal / quizMax) * 10000) / 100}% SJE`
                                : "—"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Final & Practical Examinations */}
                  <div id="student-practicals" className="scroll-mt-24">
                    <h2 className="mb-1 border-l-2 border-accent pl-2 font-semibold text-on-surface">
                      Final &amp; Practical Examinations
                    </h2>
                    <p className="mb-3 text-xs text-on-surface-variant">
                      Enter raw scores. Percentages are computed at graduation.
                    </p>
                    <div className="overflow-hidden rounded-md border border-outline-variant/60">
                      <table className="w-full text-left text-xs text-on-surface">
                        <thead className="bg-surface-container">
                          <tr>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold">
                              Examination
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Max
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Pass
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Score
                            </th>
                            <th className="border-outline-variant/60 border-b px-3 py-2 font-semibold text-center">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {PRACTICAL_DEFS.map((def) => {
                            const raw = practicalScores[def.key] ?? "";
                            const num = Number.parseFloat(raw);
                            const entered = raw !== "" && !Number.isNaN(num);
                            const pass =
                              entered && isPracticalPassing(def.key, num);
                            return (
                              <tr key={def.key} className="even:bg-surface-low">
                                <td className="border-outline-variant/60 border-r px-3 py-2">
                                  {def.label}
                                </td>
                                <td className="border-outline-variant/60 border-r px-3 py-2 text-center font-mono">
                                  {def.maxScore}
                                </td>
                                <td className="border-outline-variant/60 border-r px-3 py-2 text-center font-mono">
                                  {def.passing}
                                </td>
                                <td className="border-outline-variant/60 border-r px-3 py-2 text-center">
                                  <input
                                    type="number"
                                    name={def.key}
                                    min={0}
                                    max={def.maxScore}
                                    step={1}
                                    value={raw}
                                    onChange={(e) =>
                                      setPracticalScores((s) => ({
                                        ...s,
                                        [def.key]: e.target.value,
                                      }))
                                    }
                                    className="w-20 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                                    placeholder="—"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <PassBadge pass={pass} entered={entered} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
