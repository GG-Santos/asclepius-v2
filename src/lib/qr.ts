import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** Absolute origin of the current request (protocol + host). */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Data-URL PNG QR code for a verification link to the given license. */
export async function verifyQrDataUrl(
  lcn: string,
  opts?: {
    width?: number;
    dark?: string;
    light?: string;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  },
): Promise<string> {
  const origin = await getOrigin();
  const url = `${origin}/verify/${encodeURIComponent(lcn)}`;
  return QRCode.toDataURL(url, {
    width: opts?.width ?? 240,
    margin: 1,
    // Generated bitmap, not CSS: dark-on-white for scanner contrast
    // (mode-invariant by design — QR backings stay white).
    color: {
      dark: opts?.dark ?? "#18181b",
      light: opts?.light ?? "#ffffff",
    },
    errorCorrectionLevel: opts?.errorCorrectionLevel ?? "M",
  });
}

/**
 * QR variant embedded in the certificate artwork: brand-navy modules and
 * ECC level H (30% recovery) because the design overlays a logo on the QR
 * center — the covered modules must stay recoverable.
 */
export function certificateQrDataUrl(lcn: string): Promise<string> {
  return verifyQrDataUrl(lcn, {
    width: 786,
    dark: "#0d1671",
    errorCorrectionLevel: "H",
  });
}
