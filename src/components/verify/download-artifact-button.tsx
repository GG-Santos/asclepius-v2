"use client";

import { Download, Loader2 } from "lucide-react";
import { type RefObject, useState } from "react";
import { toast } from "sonner";

/**
 * Print-grade PNG export for an artifact node.
 *
 * - `targetWidth` fixes the output pixel width regardless of on-screen size
 *   (certificate → 3300px ≈ letter/short-bond landscape @300dpi; ID cards →
 *   2022px ≈ ISO ID-1 / ATM card width @600dpi).
 * - The clone is exported with SHARP corners: radius, border, and shadow are
 *   stripped so the print file has no rounded screen chrome.
 */
export function DownloadArtifactButton({
  targetRef,
  filename,
  targetWidth,
  label = "Download PNG",
}: {
  targetRef: RefObject<HTMLDivElement | null>;
  filename: string;
  targetWidth: number;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    const node = targetRef.current;
    if (!node || node.offsetWidth === 0) {
      toast.error("Nothing to render yet — try again.");
      return;
    }
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: targetWidth / node.offsetWidth,
        backgroundColor: "#ffffff",
        style: {
          borderRadius: "0",
          border: "none",
          boxShadow: "none",
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch {
      toast.error(
        "Could not render the PNG. If the photo just changed, reload and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-card px-2.5 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 dark:border-white/[0.1]"
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="size-3.5" aria-hidden />
      )}
      {busy ? "Rendering…" : label}
    </button>
  );
}
