import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  updatePublicForm,
  updateSubmissionStatus,
} from "@/app/dashboard/forms/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  fieldsToText,
  type PublicFormField,
  parsePublicFormFields,
} from "@/lib/form-builder";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const SUBMISSION_STATUSES = [
  "NEW",
  "REVIEWING",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

export default async function FormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const form = await prisma.publicForm.findUnique({
    where: { id },
    include: { submissions: { orderBy: { createdAt: "desc" } } },
  });
  if (!form) notFound();

  const fields = parsePublicFormFields(form.fields);
  const fieldsText = fieldsToText(fields);
  const counts = SUBMISSION_STATUSES.map((status) => ({
    status,
    count: form.submissions.filter((submission) => submission.status === status)
      .length,
  }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link
        href="/dashboard/forms"
        className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Forms
      </Link>

      <PageHeader
        title={form.title}
        meta={
          <p>
            {form.status === "PUBLISHED" ? "Published" : "Draft"} ·{" "}
            {form.submissions.length} submission
            {form.submissions.length === 1 ? "" : "s"}
          </p>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/forms/${form.id}/export`}>
                <Download className="mr-2 size-4" />
                Export CSV
              </Link>
            </Button>
            {form.status === "PUBLISHED" && (
              <Button asChild size="sm">
                <Link href={`/forms/${form.slug}`} target="_blank">
                  <ExternalLink className="mr-2 size-4" />
                  Open public form
                </Link>
              </Button>
            )}
          </>
        }
      />

      {query.error === "fields" && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm text-warning">
            Add at least one field before saving.
          </CardContent>
        </Card>
      )}
      {query.saved && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="p-4 text-sm text-success">
            Form saved.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit form</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updatePublicForm} className="space-y-5">
              <input type="hidden" name="id" value={form.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={form.title}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" name="slug" defaultValue={form.slug} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Audience</Label>
                  <Input
                    id="audience"
                    name="audience"
                    defaultValue={form.audience}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" name="status" defaultValue={form.status}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={form.description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fields">Fields</Label>
                <Textarea
                  id="fields"
                  name="fields"
                  rows={10}
                  defaultValue={fieldsText}
                  className="font-mono text-xs"
                  required
                />
                <p className="text-xs text-on-surface-variant">
                  Format: label | type | required/optional | options. Select
                  options are comma-separated.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consentText">Consent text</Label>
                <Textarea
                  id="consentText"
                  name="consentText"
                  rows={3}
                  defaultValue={form.consentText ?? ""}
                />
              </div>
              <Button type="submit">Save form</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review lanes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {counts.map(({ status, count }) => (
              <div
                key={status}
                className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm"
              >
                <span className="text-on-surface-variant">
                  {statusLabel(status)}
                </span>
                <span className="tabular font-semibold text-on-surface">
                  {count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {form.submissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant px-4 py-8 text-center text-sm text-on-surface-variant">
              No submissions yet.
            </p>
          ) : (
            <div className="space-y-4">
              {form.submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-lg border border-outline-variant/60 bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-on-surface">
                        {submission.respondentName || "Anonymous submission"}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {submission.respondentEmail || "No email"} ·{" "}
                        {submission.createdAt.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={badgeForSubmission(submission.status)}>
                      {statusLabel(submission.status)}
                    </Badge>
                  </div>

                  <SubmissionData data={submission.data} fields={fields} />

                  <form
                    action={updateSubmissionStatus}
                    className="mt-4 grid gap-3 md:grid-cols-[12rem_1fr_auto]"
                  >
                    <input type="hidden" name="id" value={submission.id} />
                    <input type="hidden" name="formId" value={form.id} />
                    <Select name="status" defaultValue={submission.status}>
                      {SUBMISSION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </Select>
                    <Input
                      name="notes"
                      placeholder="Internal note"
                      defaultValue={submission.notes ?? ""}
                    />
                    <Button type="submit" variant="outline">
                      Update
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubmissionData({
  data,
  fields,
}: {
  data: unknown;
  fields: PublicFormField[];
}) {
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const labels = new Map(fields.map((field) => [field.id, field.label]));
  const rows = Object.entries(record);

  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-on-surface-variant">
        No field data stored.
      </p>
    );
  }

  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      {rows.map(([key, value]) => (
        <div key={key} className="rounded-md bg-card px-3 py-2">
          <dt className="text-xs font-medium text-on-surface-variant">
            {labels.get(key) ?? key}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-on-surface">
            {String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function badgeForSubmission(status: string) {
  if (status === "APPROVED") return "verified";
  if (status === "REJECTED") return "expired";
  if (status === "NEW" || status === "REVIEWING") return "pending";
  return "neutral";
}
