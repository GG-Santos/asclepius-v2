"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  HOME_CONTENT_DEFAULTS,
  parseHomePageContent,
} from "@/lib/home-content";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const FIELDS = Object.keys(HOME_CONTENT_DEFAULTS) as Array<
  keyof typeof HOME_CONTENT_DEFAULTS
>;

export async function saveHomePageContent(formData: FormData): Promise<void> {
  await requireAdmin();
  const raw = Object.fromEntries(
    FIELDS.map((key) => [key, String(formData.get(key) ?? "")]),
  );
  const content = parseHomePageContent(raw as Prisma.JsonValue);
  await prisma.siteContent.upsert({
    where: { key: "homepage" },
    create: { key: "homepage", content: content as Prisma.InputJsonValue },
    update: { content: content as Prisma.InputJsonValue },
  });
  revalidatePath("/");
  revalidatePath("/dashboard/site-content");
}

export async function resetHomePageContent(): Promise<void> {
  await requireAdmin();
  await prisma.siteContent.deleteMany({ where: { key: "homepage" } });
  revalidatePath("/");
  revalidatePath("/dashboard/site-content");
}
