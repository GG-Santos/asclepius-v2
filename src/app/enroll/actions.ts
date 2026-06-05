"use server";

import { prisma } from "@/lib/prisma";
import { inquiryInputSchema } from "@/lib/validation";

export type InquiryState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitInquiry(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const parsed = inquiryInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues)
      fe[i.path.map(String).join(".")] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }

  const { name, email, phone, program, message } = parsed.data;
  try {
    await prisma.inquiry.create({
      data: { name, email, phone, program, message },
    });
  } catch {
    return { error: "Could not submit your inquiry. Please try again." };
  }

  return { ok: true };
}
