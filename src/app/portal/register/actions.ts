"use server";

import { z } from "zod";
import { authProvision } from "@/lib/auth-provision";
import { verificationState } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";

export type RegisterState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  lcn: z.string().trim().min(1, "License number is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

function lastNameMatches(
  g: { lastName: string | null; name: string | null },
  input: string,
): boolean {
  const want = input.trim().toLowerCase();
  if (g.lastName && g.lastName.trim().toLowerCase() === want) return true;
  // Legacy records may only have a denormalized name.
  return Boolean(g.name?.toLowerCase().includes(want));
}

export async function registerGraduate(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues)
      fe[i.path.map(String).join(".")] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const { lcn, lastName, email, password } = parsed.data;

  const graduate = await prisma.graduate.findUnique({ where: { lcn } });
  // Generic message — don't reveal which part failed.
  const noMatch = {
    error:
      "No matching active credential for that License Number and last name.",
  };
  if (!graduate || graduate.status === "ARCHIVED") return noMatch;
  if (!lastNameMatches(graduate, lastName)) return noMatch;

  if (verificationState(graduate) !== "verified") {
    return { error: "This license is expired. Renew it to access the portal." };
  }

  const existingForLcn = await prisma.user.findFirst({
    where: { graduateLcn: lcn },
  });
  if (existingForLcn) {
    return {
      error: "An account already exists for this license. Sign in instead.",
    };
  }
  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return { error: "That email is already in use." };

  try {
    await authProvision.api.signUpEmail({
      body: { name: graduate.name ?? `Graduate ${lcn}`, email, password },
    });
  } catch {
    return { error: "Could not create the account. Try a different email." };
  }
  // The auth default role is already "graduate", so a crash between signUp
  // and this update can no longer strand a privileged account — the update
  // only attaches the LCN and marks the email verified.
  await prisma.user.update({
    where: { email },
    data: { role: "graduate", graduateLcn: lcn, emailVerified: true },
  });

  return { ok: true };
}
