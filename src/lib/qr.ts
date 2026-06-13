import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { getQrConfig, type QrErrorCorrection } from "@/lib/qr-config";

type QrRenderOptions = {
  width?: number;
  dark?: string;
  light?: string;
  errorCorrectionLevel?: QrErrorCorrection;
};

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
  opts?: QrRenderOptions,
): Promise<string> {
  const origin = await getOrigin();
  const config = await getQrConfig();
  const url = `${origin}/verify/${encodeURIComponent(lcn)}`;
  return QRCode.toDataURL(url, {
    width: opts?.width ?? config.size,
    margin: 1,
    // Generated bitmap, not CSS: dark-on-white for scanner contrast
    // (mode-invariant by design — QR backings stay white).
    color: {
      dark: opts?.dark ?? config.foreground,
      light: opts?.light ?? config.background,
    },
    errorCorrectionLevel:
      opts?.errorCorrectionLevel ?? config.errorCorrectionLevel,
  });
}

/**
 * QR variant embedded in certificate artwork. It uses org colors, but forces
 * ECC level H (30% recovery) because template designs may overlay a logo on
 * the QR center — the covered modules must stay recoverable.
 */
export function certificateQrDataUrl(lcn: string): Promise<string> {
  return verifyQrDataUrl(lcn, {
    width: 786,
    errorCorrectionLevel: "H",
  });
}
