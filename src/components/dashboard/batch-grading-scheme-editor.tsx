"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBatchGradingScheme } from "@/app/dashboard/batches/actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  ASSESSMENT_SCHEME_TEMPLATES,
  buildCategoryScheme,
  CANONICAL_GROUPS,
  type CanonicalGroup,
  type GradingScheme,
  makeCategoryKey,
  officialTemplateForBatchCode,
  type SchemeAssessment,
  type SchemeCategory,
} from "@/lib/assessment-scheme";
import { cn } from "@/lib/utils";

type AssessmentRow = {
  id: string;
  key: string;
  label: string;
  maxScore: string;
  passing: string;
  date: string;
};

type CategoryRow = {
  id: string;
  key: string;
  label: string;
  weight: string;
  legacyGroup?: CanonicalGroup;
  assessments: AssessmentRow[];
};

let seq = 0;
function freshId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function cloneCategoriesFromScheme(scheme: GradingScheme): CategoryRow[] {
  return scheme.categories.map((category) => ({
    id: freshId("category"),
    key: category.key,
    label: category.label,
    weight: String(category.weight),
    legacyGroup: category.legacyGroup,
    assessments: category.assessments.map((assessment) => ({
      id: freshId("assessment"),
      key: assessment.key,
      label: assessment.label,
      maxScore: String(assessment.maxScore),
      passing:
        assessment.passing !== undefined ? String(assessment.passing) : "",
      date: assessment.date ?? "",
    })),
  }));
}

function nextLegacyGroup(rows: CategoryRow[]): CanonicalGroup | undefined {
  const used = new Set(rows.map((row) => row.legacyGroup).filter(Boolean));
  return CANONICAL_GROUPS.find((group) => !used.has(group));
}

function defaultTemplate(batchCode: string, defaultTemplateId?: string) {
  return (
    (defaultTemplateId
      ? ASSESSMENT_SCHEME_TEMPLATES.find(
          (entry) => entry.id === defaultTemplateId,
        )
      : null) ??
    officialTemplateForBatchCode(batchCode) ??
    ASSESSMENT_SCHEME_TEMPLATES.find(
      (entry) => entry.id === "standard-six-category",
    )
  );
}

function defaultRows(
  batchCode: string,
  defaultTemplateId?: string,
  stripDefaultDates = false,
): CategoryRow[] {
  const template =
    defaultTemplate(batchCode, defaultTemplateId) ??
    ASSESSMENT_SCHEME_TEMPLATES[0];
  return template
    ? cloneCategoriesFromScheme(template.scheme).map((category) => ({
        ...category,
        assessments: category.assessments.map((assessment) => ({
          ...assessment,
          date: stripDefaultDates ? "" : assessment.date,
        })),
      }))
    : [];
}

function toAssessment(row: AssessmentRow, index: number): SchemeAssessment {
  return {
    key: row.key || `assessment-${index + 1}`,
    label: row.label.trim() || `Assessment ${index + 1}`,
    maxScore: Number(row.maxScore),
    ...(row.passing !== "" ? { passing: Number(row.passing) } : {}),
    ...(row.date ? { date: row.date } : {}),
  };
}

function toCategory(row: CategoryRow, index: number): SchemeCategory {
  return {
    key: row.key || makeCategoryKey(row.label, index + 1),
    label: row.label.trim() || `Category ${index + 1}`,
    weight: Number(row.weight),
    ...(row.legacyGroup ? { legacyGroup: row.legacyGroup } : {}),
    assessments: row.assessments.map(toAssessment),
  };
}

export function BatchGradingSchemeEditor({
  batchId,
  batchCode,
  initialScheme,
  gradedStudentCount,
  hasPracticalColumnData,
  formFieldName,
  defaultTemplateId,
  stripDefaultDates = false,
}: {
  batchId?: string;
  batchCode: string;
  initialScheme: GradingScheme | null;
  /** Students in this batch with at least one entered score. */
  gradedStudentCount: number;
  /** Students with values in the legacy practical columns (ignored under a scheme). */
  hasPracticalColumnData: boolean;
  /** When provided, the editor writes a draft scheme into an outer form. */
  formFieldName?: string;
  defaultTemplateId?: string;
  stripDefaultDates?: boolean;
}) {
  const router = useRouter();
  const isDraft = Boolean(formFieldName);
  const [rows, setRows] = useState<CategoryRow[]>(() =>
    initialScheme
      ? cloneCategoriesFromScheme(initialScheme)
      : defaultRows(batchCode, defaultTemplateId, stripDefaultDates),
  );
  const [missingAsZero, setMissingAsZero] = useState(
    initialScheme?.missingAsZero ??
      defaultTemplate(batchCode, defaultTemplateId)?.scheme.missingAsZero ??
      false,
  );
  const [pending, startTransition] = useTransition();
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0),
    [rows],
  );
  const weightOk = Math.abs(totalWeight - 100) <= 0.05;

  function patchCategory(id: string, field: "label" | "weight", value: string) {
    setRows((existing) =>
      existing.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function patchAssessment(
    categoryId: string,
    assessmentId: string,
    field: "label" | "date" | "passing" | "maxScore",
    value: string,
  ) {
    setRows((existing) =>
      existing.map((category) =>
        category.id !== categoryId
          ? category
          : {
              ...category,
              assessments: category.assessments.map((assessment) =>
                assessment.id === assessmentId
                  ? { ...assessment, [field]: value }
                  : assessment,
              ),
            },
      ),
    );
  }

  function addCategory() {
    setRows((existing) => {
      const legacyGroup = nextLegacyGroup(existing);
      const index = existing.length + 1;
      return [
        ...existing,
        {
          id: freshId("category"),
          key: makeCategoryKey(`Category ${index}`, index),
          label: "",
          weight: "0",
          legacyGroup,
          assessments: [
            {
              id: freshId("assessment"),
              key: `assessment-${freshId("key")}`,
              label: "",
              maxScore: "100",
              passing: "",
              date: "",
            },
          ],
        },
      ];
    });
  }

  function addAssessment(categoryId: string) {
    setRows((existing) =>
      existing.map((category) => {
        if (category.id !== categoryId) return category;
        const index = category.assessments.length + 1;
        return {
          ...category,
          assessments: [
            ...category.assessments,
            {
              id: freshId("assessment"),
              key: `${category.key}-a${index}-${seq}`,
              label: "",
              maxScore: "100",
              passing: "",
              date: "",
            },
          ],
        };
      }),
    );
  }

  function buildScheme(): GradingScheme | string {
    if (rows.length === 0) return "Add at least one category.";
    const categories = rows.map(toCategory);
    const keySet = new Set<string>();
    const assessmentSet = new Set<string>();
    for (const category of categories) {
      if (!category.label.trim()) return "Each category needs a label.";
      if (!Number.isFinite(category.weight) || category.weight <= 0) {
        return `${category.label}: weight must be above 0.`;
      }
      if (keySet.has(category.key)) {
        return `${category.label}: category key is duplicated.`;
      }
      keySet.add(category.key);
      if (category.assessments.length === 0) {
        return `${category.label}: add at least one assessment.`;
      }
      for (const assessment of category.assessments) {
        if (!assessment.label.trim()) {
          return `${category.label}: each assessment needs a label.`;
        }
        if (assessmentSet.has(assessment.key)) {
          return `${assessment.label}: assessment key is duplicated.`;
        }
        assessmentSet.add(assessment.key);
        if (!Number.isFinite(assessment.maxScore) || assessment.maxScore <= 0) {
          return `${assessment.label}: max score must be above 0.`;
        }
        if (
          assessment.passing !== undefined &&
          (!Number.isFinite(assessment.passing) ||
            assessment.passing < 0 ||
            assessment.passing > assessment.maxScore)
        ) {
          return `${assessment.label}: passing mark must be within 0-${assessment.maxScore}.`;
        }
      }
    }
    const sum = categories.reduce((s, category) => s + category.weight, 0);
    if (Math.abs(sum - 100) > 0.05) {
      return `Category weights must total 100%. Current total is ${Math.round(sum * 100) / 100}%.`;
    }
    return buildCategoryScheme(categories, {
      mode: "category-average",
      missingAsZero,
    });
  }

  function save() {
    if (!batchId) return;
    const scheme = buildScheme();
    if (typeof scheme === "string") {
      toast.error(scheme);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", batchId);
      fd.set("gradingScheme", JSON.stringify(scheme));
      const result = await updateBatchGradingScheme({}, fd);
      if (result.ok) {
        toast.success("Assessment scheme saved.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not save the scheme.");
      }
    });
  }

  function clearScheme() {
    if (!batchId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", batchId);
      fd.set("gradingScheme", "null");
      const result = await updateBatchGradingScheme({}, fd);
      if (result.ok) {
        toast.success("Scheme removed.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not remove the scheme.");
      }
    });
  }

  const draftScheme = formFieldName ? buildScheme() : null;
  const draftError = typeof draftScheme === "string" ? draftScheme : null;
  const draftPayload =
    formFieldName && draftScheme
      ? typeof draftScheme === "string"
        ? `__INVALID__:${draftScheme}`
        : JSON.stringify(draftScheme)
      : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">
          Assessment scheme
          <span className="ml-2 text-xs font-normal text-on-surface-variant">
            {initialScheme
              ? "custom for this batch"
              : isDraft
                ? "included on create"
                : "template draft"}
          </span>
        </CardTitle>
        {!isDraft && (
          <div className="flex items-center gap-2">
            {initialScheme && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmClear(true)}
              >
                <RotateCcw aria-hidden /> Remove
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={pending || !weightOk}
              onClick={() =>
                gradedStudentCount > 0 || hasPracticalColumnData
                  ? setConfirmSave(true)
                  : save()
              }
            >
              Save scheme
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {formFieldName && (
          <>
            <input
              type="hidden"
              name={formFieldName}
              value={draftPayload}
              readOnly
            />
            {draftError && (
              <p className="rounded-md bg-error/10 px-3 py-2 text-xs font-medium text-error">
                {draftError}
              </p>
            )}
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-outline-variant/60 bg-surface-low px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-on-surface">
              <input
                type="checkbox"
                checked={missingAsZero}
                onChange={(event) => setMissingAsZero(event.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
              />
              Missing as 0
            </label>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono text-xs font-semibold",
              weightOk
                ? "bg-success/15 text-success"
                : "bg-error/15 text-error",
            )}
          >
            {Math.round(totalWeight * 100) / 100}%
          </span>
        </div>

        <div className="space-y-3">
          {rows.map((category) => (
            <div
              key={category.id}
              className="rounded-md border border-outline-variant/60 bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-outline-variant/40 border-b bg-surface-container px-3 py-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input
                    value={category.label}
                    onChange={(event) =>
                      patchCategory(category.id, "label", event.target.value)
                    }
                    placeholder="Category label"
                    className="min-w-56 flex-1 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={category.weight}
                    onChange={(event) =>
                      patchCategory(category.id, "weight", event.target.value)
                    }
                    className="w-24 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <button
                  type="button"
                  title="Remove category"
                  disabled={rows.length <= 1}
                  onClick={() =>
                    setRows((existing) =>
                      existing.filter((row) => row.id !== category.id),
                    )
                  }
                  className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary disabled:opacity-40"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-surface-low">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Assessment</th>
                      <th className="px-3 py-2 text-center font-semibold">
                        Date
                      </th>
                      <th className="px-3 py-2 text-center font-semibold">
                        Passing
                      </th>
                      <th className="px-3 py-2 text-center font-semibold">
                        Max
                      </th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {category.assessments.map((assessment) => (
                      <tr
                        key={assessment.id}
                        className="odd:bg-card even:bg-surface-low"
                      >
                        <td className="px-3 py-2">
                          <input
                            value={assessment.label}
                            onChange={(event) =>
                              patchAssessment(
                                category.id,
                                assessment.id,
                                "label",
                                event.target.value,
                              )
                            }
                            placeholder="Assessment label"
                            className="w-full min-w-52 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <DatePicker
                            value={assessment.date}
                            outputFormat="iso"
                            placeholder="Set date"
                            className="min-w-40"
                            onValueChange={(value) =>
                              patchAssessment(
                                category.id,
                                assessment.id,
                                "date",
                                value,
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            value={assessment.passing}
                            onChange={(event) =>
                              patchAssessment(
                                category.id,
                                assessment.id,
                                "passing",
                                event.target.value,
                              )
                            }
                            placeholder="-"
                            className="w-20 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={assessment.maxScore}
                            onChange={(event) =>
                              patchAssessment(
                                category.id,
                                assessment.id,
                                "maxScore",
                                event.target.value,
                              )
                            }
                            className="w-20 rounded border border-outline-variant/60 bg-surface px-2 py-1 text-center font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            title="Remove assessment"
                            disabled={category.assessments.length <= 1}
                            onClick={() =>
                              setRows((existing) =>
                                existing.map((row) =>
                                  row.id !== category.id
                                    ? row
                                    : {
                                        ...row,
                                        assessments: row.assessments.filter(
                                          (item) => item.id !== assessment.id,
                                        ),
                                      },
                                ),
                              )
                            }
                            className="rounded p-1 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary disabled:opacity-40"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-outline-variant/40 border-t px-3 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addAssessment(category.id)}
                >
                  <Plus aria-hidden /> Add assessment
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" size="sm" variant="outline" onClick={addCategory}>
          <Plus aria-hidden /> Add category
        </Button>
      </CardContent>

      {!isDraft && (
        <>
          <ConfirmDialog
            open={confirmSave}
            onOpenChange={setConfirmSave}
            title="Save assessment scheme?"
            description={`${gradedStudentCount} student(s) already have entered scores. Raw values stay as entered and recompute under this scheme.${hasPracticalColumnData ? " Values in the old practical fields are kept but ignored while a scheme is active." : ""}`}
            confirmLabel="Save scheme"
            tone="primary"
            pending={pending}
            onConfirm={() => {
              setConfirmSave(false);
              save();
            }}
          />
          <ConfirmDialog
            open={confirmClear}
            onOpenChange={setConfirmClear}
            title="Remove this batch's scheme?"
            description="Grading returns to the standard model. Entered assessment scores are kept but no longer used."
            confirmLabel="Remove scheme"
            tone="danger"
            pending={pending}
            onConfirm={() => {
              setConfirmClear(false);
              clearScheme();
            }}
          />
        </>
      )}
    </Card>
  );
}
