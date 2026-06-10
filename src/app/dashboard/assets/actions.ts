"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type AssetActionState = { ok?: boolean; error?: string };

export async function createContentAsset(input: {
  name: string;
  description?: string;
  assetType: string;
  url: string;
  mimeType?: string;
  size?: number;
}): Promise<AssetActionState> {
  const session = await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!input.url) return { error: "Missing file URL." };
  await prisma.contentAsset.create({
    data: {
      name,
      description: input.description?.trim() || null,
      assetType: input.assetType,
      url: input.url,
      mimeType: input.mimeType ?? null,
      size: input.size ?? null,
      uploadedBy: session.user.id,
    },
  });
  revalidatePath("/dashboard/assets");
  return { ok: true };
}

export async function setAssetPublic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const pub = String(formData.get("public") ?? "") === "true";
  await prisma.contentAsset.update({ where: { id }, data: { public: pub } });
  revalidatePath("/dashboard/assets");
}

export async function deleteContentAsset(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.contentAsset.delete({ where: { id } });
  revalidatePath("/dashboard/assets");
}
