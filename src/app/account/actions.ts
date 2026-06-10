"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type AccountActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm the new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "New password must differ from the current one",
  });

/**
 * Self-service password change for ANY signed-in account (staff or graduate).
 * The current password is verified by BetterAuth; other sessions are always
 * revoked (hardcoded — not user-controlled) so a stolen session can't survive
 * a password rotation.
 */
export async function changeMyPassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  await requireUser();

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues)
      fe[i.path.map(String).join(".")] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch {
    // BetterAuth rejects with INVALID_PASSWORD on a wrong current password —
    // nothing has changed at this point.
    return {
      error: "Current password is incorrect.",
      fieldErrors: { currentPassword: "Doesn't match your current password" },
    };
  }

  return { ok: true };
}

/**
 * Sets the signed-in user's avatar to a MediaAsset they just uploaded via
 * /api/upload. Only asset ids we host are accepted — an arbitrary external
 * URL can never become an avatar.
 */
export async function updateMyAvatar(
  assetId: string,
): Promise<AccountActionState> {
  const session = await requireUser();

  const id = assetId.trim();
  if (!id) return { error: "No image." };

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return { error: "Image not found." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: asset.url },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
