import { notFound } from "next/navigation";
import { parsePublicFormFields } from "@/lib/form-builder";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

function csvCell(value: unknown) {
  const text =
    value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await ctx.params;
  const form = await prisma.publicForm.findUnique({
    where: { id },
    include: { submissions: { orderBy: { createdAt: "desc" } } },
  });
  if (!form) notFound();

  const fields = parsePublicFormFields(form.fields);
  const headers = [
    "Submitted at",
    "Status",
    "Name",
    "Email",
    "LCN",
    "Consent accepted",
    "Notes",
    ...fields.map((field) => field.label),
  ];

  const rows = form.submissions.map((submission) => {
    const data =
      submission.data &&
      typeof submission.data === "object" &&
      !Array.isArray(submission.data)
        ? (submission.data as Record<string, unknown>)
        : {};
    return [
      submission.createdAt.toISOString(),
      submission.status,
      submission.respondentName,
      submission.respondentEmail,
      submission.graduateLcn,
      submission.consentAccepted ? "yes" : "no",
      submission.notes,
      ...fields.map((field) => data[field.id]),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugPart(
        form.title,
      )}-submissions.csv"`,
    },
  });
}
