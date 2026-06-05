"use server";

import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authProvision } from "@/lib/auth-provision";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type StaffActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["admin", "writer"]),
});

export async function createStaff(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  await requireAdmin();
  const parsed = createStaffSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { name, email, password, role } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: `${email} already has an account.` };

  try {
    await authProvision.api.signUpEmail({ body: { name, email, password } });
  } catch {
    return { error: "Could not create the account. Try a different email." };
  }
  await prisma.user.update({
    where: { email },
    data: { role, emailVerified: true },
  });

  revalidatePath("/dashboard/staff");
  return { ok: true };
}

export async function setStaffRole(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || (role !== "admin" && role !== "writer")) return;

  // Never let an admin demote themselves (avoids self-lockout).
  if (id === session.user.id) return;
  // Never remove the last admin.
  if (role === "writer") {
    const admins = await prisma.user.count({ where: { role: "admin" } });
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "admin" && admins <= 1) return;
  }

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/dashboard/staff");
}

export async function setStaffPassword(
  formData: FormData,
): Promise<StaffActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id) return { error: "Missing user." };
  if (password.length < 8) return { error: "Password must be ≥ 8 characters." };

  // BetterAuth stores the email/password credential on the "credential" account.
  const account = await prisma.account.findFirst({
    where: { userId: id, providerId: "credential" },
  });
  if (!account) return { error: "This user has no password credential." };

  const hash = await hashPassword(password);
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hash },
  });
  return { ok: true };
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === session.user.id) return; // can't delete yourself

  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === "admin") {
    const admins = await prisma.user.count({ where: { role: "admin" } });
    if (admins <= 1) return; // keep at least one admin
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/dashboard/staff");
}
