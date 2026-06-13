import "server-only";
import type { Prisma } from "@prisma/client";
import { getOrgSettings } from "@/lib/org-settings";

export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export type QrConfig = {
  size: number;
  foreground: string;
  background: string;
  errorCorrectionLevel: QrErrorCorrection;
  logoUrl: string;
};

export const QR_CONFIG_DEFAULTS: QrConfig = {
  size: 240,
  foreground: "#18181b",
  background: "#ffffff",
  errorCorrectionLevel: "M",
  logoUrl: "",
};

const ECC: QrErrorCorrection[] = ["L", "M", "Q", "H"];

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim()
    : fallback;
}

function url(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("/")) return raw.slice(0, 2000);
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? raw.slice(0, 2000)
      : "";
  } catch {
    return "";
  }
}

export function parseQrConfig(raw: Prisma.JsonValue | null | undefined) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return QR_CONFIG_DEFAULTS;
  }
  const record = raw as Record<string, unknown>;
  const size = Number(record.size);
  const ecc = String(record.errorCorrectionLevel ?? "");
  return {
    size: Number.isInteger(size)
      ? Math.min(1024, Math.max(128, size))
      : QR_CONFIG_DEFAULTS.size,
    foreground: color(record.foreground, QR_CONFIG_DEFAULTS.foreground),
    background: color(record.background, QR_CONFIG_DEFAULTS.background),
    errorCorrectionLevel: ECC.includes(ecc as QrErrorCorrection)
      ? (ecc as QrErrorCorrection)
      : QR_CONFIG_DEFAULTS.errorCorrectionLevel,
    logoUrl: url(record.logoUrl),
  } satisfies QrConfig;
}

export async function getQrConfig(): Promise<QrConfig> {
  const settings = await getOrgSettings();
  return parseQrConfig(settings?.qrConfig);
}

export function contrastRatio(hexA: string, hexB: string): number {
  function channel(hex: string, start: number) {
    const raw = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  }
  function lum(hex: string) {
    return (
      0.2126 * channel(hex, 1) +
      0.7152 * channel(hex, 3) +
      0.0722 * channel(hex, 5)
    );
  }
  const a = lum(hexA);
  const b = lum(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
