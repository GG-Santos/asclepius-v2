import { ExternalLink, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { createPublicForm } from "@/app/dashboard/forms/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const FIELD_EXAMPLE = `Full name | text | required
Email address | email | required
Phone number | phone | optional
Program interest | select | required | EMT, EMR, BLS
Message | textarea | optional`;

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const forms = await prisma.publicForm.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { submissions: true } },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, status: true },
      },
    },
  });
  const published = forms.filter((form) => form.status === "PUBLISHED").length;
  const newSubmissions = forms.reduce(
    (total, form) => total + form._count.submissions,
    0,
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title="Forms"
        meta={
          <p>
            Graduate update, admission, and consent forms with an admin review
            queue and CSV export.
          </p>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Public forms</CardTitle>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <p className="rounded-lg border border-dashed border-outline-variant px-4 py-8 text-center text-sm text-on-surface-variant">
                No forms yet. Create a graduate update or admission form to
                start collecting submissions.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container text-on-surface">
                      <th className="px-4 py-2.5 text-left font-semibold">
                        Form
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        Submissions
                      </th>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        Updated
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.map((form) => (
                      <tr
                        key={form.id}
                        className="border-outline-variant/40 border-t odd:bg-card even:bg-surface-low hover:bg-surface-container/60"
                      >
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/dashboard/forms/${form.id}`}
                            className="font-medium text-on-surface hover:text-accent"
                          >
                            {form.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-on-surface-variant">
                            /forms/{form.slug} · {form.audience}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={
                              form.status === "PUBLISHED"
                                ? "verified"
                                : "neutral"
                            }
                          >
                            {form.status === "PUBLISHED"
                              ? "Published"
                              : "Draft"}
                          </Badge>
                        </td>
                        <td className="tabular px-4 py-2.5 text-on-surface-variant">
                          {form._count.submissions}
                        </td>
                        <td className="px-4 py-2.5 text-on-surface-variant">
                          {form.updatedAt.toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {form.status === "PUBLISHED" && (
                              <Link
                                href={`/forms/${form.slug}`}
                                target="_blank"
                                className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
                                title="Open public form"
                              >
                                <ExternalLink className="size-4" />
                              </Link>
                            )}
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/forms/${form.id}`}>
                                Review
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <SummaryStat label="Total forms" value={forms.length} />
              <SummaryStat label="Published" value={published} />
              <SummaryStat label="Submissions" value={newSubmissions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-accent" />
                Create form
              </CardTitle>
            </CardHeader>
            <CardContent>
              {params.error === "fields" && (
                <p className="mb-3 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning">
                  Add at least one field before saving.
                </p>
              )}
              <form action={createPublicForm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Graduate update form"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Audience</Label>
                  <Input
                    id="audience"
                    name="audience"
                    placeholder="graduates"
                    defaultValue="graduates"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" name="status" defaultValue="DRAFT">
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Tell respondents what this form is for."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fields">Fields</Label>
                  <Textarea
                    id="fields"
                    name="fields"
                    rows={8}
                    defaultValue={FIELD_EXAMPLE}
                    className="font-mono text-xs"
                    required
                  />
                  <p className="text-xs text-on-surface-variant">
                    Format: label | type | required/optional | options. Types:
                    text, email, phone, textarea, select, date.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consentText">Consent text</Label>
                  <Textarea
                    id="consentText"
                    name="consentText"
                    rows={3}
                    defaultValue="I consent to WSL EMS collecting this information for review."
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 size-4" />
                  Create form
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface px-3 py-2">
      <span className="text-on-surface-variant">{label}</span>
      <span className="tabular font-semibold text-on-surface">{value}</span>
    </div>
  );
}
