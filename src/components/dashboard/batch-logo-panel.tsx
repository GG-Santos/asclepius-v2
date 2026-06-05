"use client";

import { ImagePlus, LayoutGrid } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

export function BatchLogoPanel({ currentUrl }: { currentUrl?: string | null }) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [assetId, setAssetId] = useState("");
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5 MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    abortRef.current = new AbortController();

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { id } = (await res.json()) as { id: string; url: string };
      setAssetId(id);
      toast.success("Logo uploaded.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Logo upload failed.");
        setPreview(currentUrl ?? null);
        setAssetId("");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-on-surface">Batch Logo</p>

      <button
        type="button"
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={uploading}
        className="group relative flex aspect-square w-full max-w-[160px] items-center justify-center overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-highest disabled:cursor-not-allowed"
      >
        {preview ? (
          // biome-ignore lint/performance/noImgElement: client blob/object-URL preview
          <img
            src={preview}
            alt="Batch logo"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <LayoutGrid className="size-12 text-on-surface-variant/30" />
        )}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-primary/0 text-on-primary opacity-0 transition group-hover:bg-primary/40 group-hover:opacity-100 group-disabled:hidden">
          <ImagePlus className="size-6" />
          <span className="text-xs font-medium">
            {uploading ? "Uploading…" : "Change"}
          </span>
        </span>
      </button>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
      <input type="hidden" name="logoAssetId" value={assetId} readOnly />

      <p className="text-xs text-on-surface-variant">
        PNG, JPG, SVG up to 5 MB.
      </p>
    </div>
  );
}
