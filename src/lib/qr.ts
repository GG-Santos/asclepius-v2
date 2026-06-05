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
export async function verifyQrDataUrl(lcn: string): Promise<string> {
  const origin = await getOrigin();
  const url = `${origin}/verify/${encodeURIComponent(lcn)}`;
  return QRCode.toDataURL(url, {
    width: 240,
    margin: 1,
    color: { dark: "#001a48", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
