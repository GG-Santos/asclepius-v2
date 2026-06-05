"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { teamMemberInputSchema } from "@/lib/validation";

export type TeamActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTeamMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requireAdmin();
  const parsed = teamMemberInputSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues)
      fe[i.path.map(String).join(".")] = i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }

  const { name, role, credentials, photoUrl } = parsed.data;
  await prisma.teamMember.create({
    data: { name, role, credentials, photoUrl },
  });
  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function setTeamPublished(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const published = String(formData.get("published") ?? "") === "true";
  if (!id) return;
  await prisma.teamMember.update({ where: { id }, data: { published } });
  revalidatePath("/dashboard/team");
  revalidatePath("/");
}

export async function deleteTeamMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.teamMember.delete({ where: { id } });
  revalidatePath("/dashboard/team");
  revalidatePath("/");
}
