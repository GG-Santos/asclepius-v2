"use client";

import { ImagePlus, LayoutGrid, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { updateBatchLogo } from "@/app/dashboard/batches/actions";

// When batchId is provided, logo changes are saved immediately via a dedicated
// server action (no form submission needed). When omitted (create flow), the
// hidden inputs are used so the parent form captures the values on submit.
export function BatchLogoPanel({
  currentUrl,
  batchId,
}: {
  currentUrl?: string | null;
  batchId?: string;
}) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [assetId, setAssetId] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPreview(currentUrl ?? null);
    setAssetId("");
    setRemoveLogo(false);
  }, [currentUrl]);

  async function saveLogo(id: string | null) {
    if (!batchId) return;
    setSaving(true);
    try {
      await updateBatchLogo(batchId, id);
      toast.success(id ? "Logo saved." : "Logo removed.");
    } catch {
      toast.error("Could not save logo.");
    } finally {
      setSaving(false);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5 MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
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
      if (batchId) {
        await saveLogo(id);
      } else {
        toast.success("Logo uploaded.");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Logo upload failed.");
        setPreview(currentUrl ?? null);
        setAssetId("");
        setRemoveLogo(false);
      }
    } finally {
      setUploading(false);
    }
  }

  async function onRemove() {
    abortRef.current?.abort();
    setPreview(null);
    setAssetId("");
    setRemoveLogo(true);
    setUploading(false);
    if (batchId) {
      await saveLogo(null);
    }
  }

  const busy = uploading || saving;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-on-surface">Batch Logo</p>

      <div className="relative w-full max-w-[160px]">
        <button
          type="button"
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={busy}
          className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-highest disabled:cursor-not-allowed"
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
              {busy ? "Saving…" : preview ? "Change" : "Upload"}
            </span>
          </span>
        </button>
        {preview && (
          <button
            type="button"
            disabled={busy}
            title="Remove logo"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Remove logo</span>
          </button>
        )}
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
      {/* Hidden inputs for the create form (no batchId — logo saved with form submit) */}
      {!batchId && (
        <>
          <input type="hidden" name="logoAssetId" value={assetId} readOnly />
          <input
            type="hidden"
            name="removeLogo"
            value={removeLogo ? "true" : "false"}
            readOnly
          />
        </>
      )}

      <p className="text-xs text-on-surface-variant">
        PNG, JPG, SVG up to 5 MB.
      </p>
    </div>
  );
}
