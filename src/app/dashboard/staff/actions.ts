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
  role: z.enum(["admin", "professor"]),
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
  if (!id || !["admin", "professor", "graduate"].includes(role)) return;

  // Never let an admin demote themselves (avoids self-lockout).
  if (id === session.user.id) return;
  // Never remove the last admin.
  if (role !== "admin") {
    const admins = await prisma.user.count({ where: { role: "admin" } });
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "admin" && admins <= 1) return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  await prisma.user.update({ where: { id }, data: { role } });
  // Reassigning a legacy writer: their authored institutional posts move to
  // the acting admin (an ex-writer turned graduate must not keep edit power
  // over public content), and active sessions are purged so the new role
  // takes effect immediately.
  if (target?.role === "writer") {
    await prisma.blogPost.updateMany({
      where: { authorId: id },
      data: { authorId: session.user.id },
    });
    await prisma.session.deleteMany({ where: { userId: id } });
  }
  revalidatePath("/dashboard/staff");
}

const updateStaffSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["admin", "professor", "graduate"]),
});

/** Edit a staff member's name, email, and role in one action. */
export async function updateStaff(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const session = await requireAdmin();
  const parsed = updateStaffSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[issue.path.join(".")] = issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const { id, name, email, role } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found." };

  // Email must stay unique.
  if (email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) return { error: `${email} is already in use.` };
  }

  // Guard against self-demotion and removing the last admin.
  let nextRole = role;
  if (id === session.user.id) nextRole = target.role as typeof role;
  else if (role !== "admin" && target.role === "admin") {
    const admins = await prisma.user.count({ where: { role: "admin" } });
    if (admins <= 1) return { error: "Keep at least one admin account." };
  }

  await prisma.user.update({
    where: { id },
    data: { name, email, role: nextRole },
  });
  // Legacy writer converted: move authored posts to the acting admin and
  // purge sessions (same rule as setStaffRole).
  if (target.role === "writer") {
    await prisma.blogPost.updateMany({
      where: { authorId: id },
      data: { authorId: session.user.id },
    });
    await prisma.session.deleteMany({ where: { userId: id } });
  }
  revalidatePath("/dashboard/staff");
  return { ok: true };
}

/** Lock or unlock an account. Locking also kills active sessions so the user
 * is signed out immediately; a locked user cannot sign back in. */
export async function setStaffLocked(
  formData: FormData,
): Promise<StaffActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const locked = String(formData.get("locked") ?? "") === "true";
  if (!id) return { error: "Missing user." };
  if (id === session.user.id)
    return { error: "You can't lock your own account." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found." };
  if (locked && target.role === "admin") {
    const admins = await prisma.user.count({
      where: { role: "admin", locked: false },
    });
    if (admins <= 1) return { error: "Keep at least one active admin." };
  }

  await prisma.user.update({
    where: { id },
    data: { locked, lockedAt: locked ? new Date() : null },
  });
  if (locked) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/dashboard/staff");
  return { ok: true };
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

export async function deleteStaff(
  formData: FormData,
): Promise<StaffActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user." };
  if (id === session.user.id)
    return { error: "You can't delete your own account." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found." };
  if (target.role === "admin") {
    const admins = await prisma.user.count({ where: { role: "admin" } });
    if (admins <= 1) return { error: "Keep at least one admin account." };
  }

  try {
    // Reassign their authored posts to the acting admin — the required
    // BlogPost→User relation would otherwise block the delete (and this
    // preserves the content instead of cascade-deleting it).
    await prisma.blogPost.updateMany({
      where: { authorId: id },
      data: { authorId: session.user.id },
    });
    // Sessions + accounts cascade automatically (onDelete: Cascade).
    await prisma.user.delete({ where: { id } });
  } catch {
    return { error: "Could not delete this account." };
  }

  revalidatePath("/dashboard/staff");
  return { ok: true };
}
