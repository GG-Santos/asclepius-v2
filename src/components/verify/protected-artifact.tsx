"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Casual-copy deterrent for PUBLIC credential artifacts. While mounted it:
 *
 * - blocks the context menu ("Save image as…" / "Inspect element"),
 * - blocks image dragging, text selection, and the iOS long-press callout,
 * - keeps direct pointer hits off the artwork `<img>` layers (children are
 *   pointer-inert under a transparent shield, so nothing image-shaped is
 *   ever the right-click target),
 * - hides the artifact from print output,
 * - swallows the common capture/devtools shortcuts (Ctrl/Cmd+S, P, U,
 *   Ctrl+Shift+I/J/C, F12) — scoped to its lifetime, i.e. an open dialog.
 *
 * A deterrent, not DRM: screenshots and the network tab cannot be blocked.
 * The authoritative check is always the registry lookup itself.
 */
export function ProtectedArtifact({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      const combo = e.ctrlKey || e.metaKey;
      if (
        e.key === "F12" ||
        (combo && !e.shiftKey && (k === "s" || k === "p" || k === "u")) ||
        (combo && e.shiftKey && (k === "i" || k === "j" || k === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    // Capture phase, window-level: runs ahead of in-page handlers while the
    // artifact is on screen; removed the moment it unmounts.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: suppressing the context menu on decorative artwork, not adding interaction
    <div
      className={cn(
        "relative select-none [-webkit-touch-callout:none] print:hidden",
        className,
      )}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Artwork stays pointer-inert; events fall through to ancestors
          (CometCard tilt keeps working via bubbling). */}
      <div className="pointer-events-none">{children}</div>
      {/* Transparent shield: whatever is clicked, it is never an <img>. */}
      <div className="absolute inset-0 z-10" aria-hidden />
    </div>
  );
}
