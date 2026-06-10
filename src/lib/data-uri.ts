import "server-only";

/**
 * Fetches an image server-side and inlines it as a base64 data URI. Used to
 * feed cross-origin (Vercel Blob) photos into client-side PNG rasterization
 * without tainting the canvas. Returns null on any failure — callers render
 * the artifact without a photo rather than breaking the page.
 */
export async function imageToDataUri(
  url: string | null,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Guard against absurd payloads (avatars/portraits are ≤5MB by upload rule).
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
