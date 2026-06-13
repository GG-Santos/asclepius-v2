"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldsToJson, parseFieldsText } from "@/lib/form-builder";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/session";

const FORM_STATUSES = ["DRAFT", "PUBLISHED"] as const;
const SUBMISSION_STATUSES = [
  "NEW",
  "REVIEWING",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

function text(value: FormDataEntryValue | null, fallback = "", max = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function statusFromForm(value: FormDataEntryValue | null) {
  return FORM_STATUSES.includes(value as (typeof FORM_STATUSES)[number])
    ? (value as (typeof FORM_STATUSES)[number])
    : "DRAFT";
}

async function uniqueSlug(base: string, currentId?: string) {
  const root = slugify(base) || "public-form";
  for (let i = 0; i < 50; i += 1) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    const existing = await prisma.publicForm.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === currentId) return slug;
  }
  return `${root}-${Date.now()}`;
}

function fieldsFromForm(formData: FormData) {
  return parseFieldsText(text(formData.get("fields"), "", 20_000)).slice(0, 40);
}

export async function createPublicForm(formData: FormData) {
  await requireAdminAction();

  const title = text(formData.get("title"), "Untitled form", 160);
  const fields = fieldsFromForm(formData);
  if (fields.length === 0) redirect("/dashboard/forms?error=fields");

  const form = await prisma.publicForm.create({
    data: {
      title,
      slug: await uniqueSlug(text(formData.get("slug"), title, 120)),
      description: text(formData.get("description"), "", 1000) || null,
      audience: text(formData.get("audience"), "graduates", 80),
      fields: fieldsToJson(fields),
      consentText:
        text(formData.get("consentText"), "", 1200) ||
        "I consent to WSL EMS collecting this information for review.",
      status: statusFromForm(formData.get("status")),
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/forms");
  redirect(`/dashboard/forms/${form.id}`);
}

export async function updatePublicForm(formData: FormData) {
  await requireAdminAction();

  const id = text(formData.get("id"), "", 80);
  if (!id) redirect("/dashboard/forms");
  const title = text(formData.get("title"), "Untitled form", 160);
  const fields = fieldsFromForm(formData);
  if (fields.length === 0) redirect(`/dashboard/forms/${id}?error=fields`);

  await prisma.publicForm.update({
    where: { id },
    data: {
      title,
      slug: await uniqueSlug(text(formData.get("slug"), title, 120), id),
      description: text(formData.get("description"), "", 1000) || null,
      audience: text(formData.get("audience"), "graduates", 80),
      fields: fieldsToJson(fields),
      consentText:
        text(formData.get("consentText"), "", 1200) ||
        "I consent to WSL EMS collecting this information for review.",
      status: statusFromForm(formData.get("status")),
    },
  });

  revalidatePath("/dashboard/forms");
  revalidatePath(`/dashboard/forms/${id}`);
  redirect(`/dashboard/forms/${id}?saved=1`);
}

export async function updateSubmissionStatus(formData: FormData) {
  await requireAdminAction();

  const id = text(formData.get("id"), "", 80);
  const formId = text(formData.get("formId"), "", 80);
  const status = SUBMISSION_STATUSES.includes(
    formData.get("status") as (typeof SUBMISSION_STATUSES)[number],
  )
    ? (formData.get("status") as (typeof SUBMISSION_STATUSES)[number])
    : "REVIEWING";
  if (!id || !formId) redirect("/dashboard/forms");

  await prisma.publicFormSubmission.update({
    where: { id },
    data: {
      status,
      notes: text(formData.get("notes"), "", 1000) || null,
      reviewedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/forms/${formId}`);
}

export async function archivePublicForm(formData: FormData) {
  await requireAdminAction();
  const id = text(formData.get("id"), "", 80);
  if (!id) redirect("/dashboard/forms");

  await prisma.publicForm.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  revalidatePath("/dashboard/forms");
  revalidatePath(`/dashboard/forms/${id}`);
}
