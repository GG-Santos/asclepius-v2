"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";

export type ModelActionState = { ok?: boolean; error?: string; id?: string };

export type ModelHotspot = {
  position: [number, number, number];
  label: string;
};

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base || "model";
  let i = 2;
  while (true) {
    const existing = await prisma.model3D.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

export async function createModel3d(input: {
  name: string;
  description?: string;
  fileUrl: string;
  posterUrl?: string | null;
  size?: number | null;
}): Promise<ModelActionState> {
  const session = await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!input.fileUrl) return { error: "Missing model file." };

  const slug = await uniqueSlug(slugify(name));
  const created = await prisma.model3D.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      fileUrl: input.fileUrl,
      posterUrl: input.posterUrl ?? null,
      size: input.size ?? null,
      uploadedBy: session.user.id,
    },
  });
  revalidatePath("/dashboard/models");
  revalidatePath("/dashboard/assets");
  revalidatePath("/showcase");
  return { ok: true, id: created.id };
}

export async function updateModel3d(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  await prisma.model3D.update({
    where: { id },
    data: { ...(name ? { name } : {}), description },
  });
  revalidatePath("/dashboard/models");
  revalidatePath("/dashboard/assets");
  revalidatePath("/showcase");
}

export async function setModelPublic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const pub = String(formData.get("public") ?? "") === "true";
  await prisma.model3D.update({ where: { id }, data: { public: pub } });
  revalidatePath("/dashboard/models");
  revalidatePath("/dashboard/assets");
  revalidatePath("/showcase");
}

export async function updateModelDisplay(input: {
  id: string;
  name?: string;
  description?: string;
  environment?: string;
  autoRotate?: boolean;
  hotspots?: ModelHotspot[];
}): Promise<ModelActionState> {
  await requireAdmin();
  if (!input.id) return { error: "Missing model." };
  await prisma.model3D.update({
    where: { id: input.id },
    data: {
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      description: input.description?.trim() || null,
      display: {
        environment: input.environment ?? "city",
        autoRotate: input.autoRotate ?? true,
      } as Prisma.InputJsonValue,
      hotspots: (input.hotspots ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/dashboard/models");
  revalidatePath("/dashboard/assets");
  revalidatePath("/showcase");
  return { ok: true };
}

export async function deleteModel3d(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.model3D.delete({ where: { id } });
  revalidatePath("/dashboard/models");
  revalidatePath("/dashboard/assets");
  revalidatePath("/showcase");
}
