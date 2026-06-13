import "server-only";
import type { Prisma } from "@prisma/client";

export type SignatureAsset = {
  id: string;
  label: string;
  role: string;
  svgDataUrl: string;
  createdAt: string;
};

function text(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseSignatureAssets(
  raw: Prisma.JsonValue | null | undefined,
): SignatureAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = text(record.id, 80);
      const svgDataUrl = text(record.svgDataUrl, 200_000);
      if (!id || !svgDataUrl.startsWith("data:image/svg+xml;base64,")) {
        return null;
      }
      return {
        id,
        label: text(record.label, 120) || "Signature",
        role: text(record.role, 120),
        svgDataUrl,
        createdAt: text(record.createdAt, 40) || new Date().toISOString(),
      } satisfies SignatureAsset;
    })
    .filter((item): item is SignatureAsset => item !== null);
}
