"use server";

import { redirect } from "next/navigation";
import { parsePublicFormFields } from "@/lib/form-builder";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function submitPublicForm(slug: string, formData: FormData) {
  const form = await prisma.publicForm.findUnique({ where: { slug } });
  if (!form || form.status !== "PUBLISHED") {
    redirect(`/forms/${encodeURIComponent(slug)}?error=unavailable`);
  }

  const fields = parsePublicFormFields(form.fields);
  const data: Record<string, string> = {};
  let missingRequired = false;

  for (const field of fields) {
    let value = text(
      formData.get(`field:${field.id}`),
      field.type === "textarea" ? 4000 : 500,
    );
    if (field.type === "select" && field.options.length > 0) {
      value = field.options.includes(value) ? value : "";
    }
    if (field.required && !value) missingRequired = true;
    data[field.id] = value;
  }

  const consentAccepted = form.consentText
    ? formData.get("consentAccepted") === "on"
    : true;

  if (missingRequired || !consentAccepted) {
    redirect(`/forms/${encodeURIComponent(slug)}?error=required`);
  }

  await prisma.publicFormSubmission.create({
    data: {
      formId: form.id,
      respondentName: text(formData.get("respondentName"), 160) || null,
      respondentEmail: text(formData.get("respondentEmail"), 200) || null,
      graduateLcn: text(formData.get("graduateLcn"), 80) || null,
      data,
      consentAccepted,
    },
  });

  redirect(`/forms/${encodeURIComponent(slug)}?submitted=1`);
}
