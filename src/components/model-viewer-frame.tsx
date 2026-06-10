"use client";

import { Loader2, Maximize2, Minimize2, Orbit, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Hotspot } from "@/components/model-viewer";
import { cn } from "@/lib/utils";

// R3F is client-only; load it without SSR and show a skeleton until ready.
const ModelViewer = dynamic(() => import("@/components/model-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
      <Loader2 className="size-6 animate-spin" />
    </div>
  ),
});

export function ModelViewerFrame({
  url,
  environment = "city",
  hotspots = [],
  autoRotate: autoRotateInit = true,
  className = "aspect-video w-full",
}: {
  url: string;
  environment?: string;
  hotspots?: Hotspot[];
  autoRotate?: boolean;
  className?: string;
}) {
  const [autoRotate, setAutoRotate] = useState(autoRotateInit);
  const [explode, setExplode] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void wrapRef.current?.requestFullscreen?.();
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "model-frame relative overflow-hidden rounded-xl border border-outline-variant/60 bg-gradient-to-b from-surface-container to-surface-low",
        className,
      )}
    >
      <ModelViewer
        url={url}
        autoRotate={autoRotate}
        environment={environment}
        explode={explode}
        resetSignal={resetSignal}
        hotspots={hotspots}
      />

      <div className="-translate-x-1/2 absolute bottom-3 left-1/2 flex items-center gap-1 rounded-full border border-outline-variant/60 bg-card/90 px-1.5 py-1 shadow-[var(--shadow-clinical-md)] backdrop-blur">
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          title={autoRotate ? "Stop auto-rotate" : "Auto-rotate"}
          className={cn(
            "rounded-full p-1.5 transition-colors hover:bg-surface-container",
            autoRotate ? "text-accent" : "text-on-surface-variant",
          )}
        >
          <Orbit className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setResetSignal((s) => s + 1)}
          title="Reset view"
          className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-accent"
        >
          <RotateCcw className="size-4" />
        </button>
        <label
          className="flex items-center gap-1.5 px-2 text-[11px] text-on-surface-variant"
          title="Spread the model's parts apart to see how it's assembled (only multi-part models separate)"
        >
          Explode
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
            className="w-20 accent-[var(--color-accent)]"
            aria-label="Explode amount"
          />
        </label>
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFs ? "Exit fullscreen" : "Fullscreen"}
          className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-accent"
        >
          {isFs ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
