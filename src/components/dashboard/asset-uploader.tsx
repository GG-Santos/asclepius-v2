"use client";

import { upload } from "@vercel/blob/client";
import { ImageIcon, Loader2, Video } from "lucide-react";
import { useRef, useState } from "react";
import { createContentAsset } from "@/app/dashboard/assets/actions";
import { Button } from "@/components/ui/button";

type AssetType = "image" | "video";

const ACCEPT: Record<AssetType, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif",
  video: "video/mp4,video/webm,video/quicktime,video/x-msvideo",
};

const LABEL: Record<AssetType, string> = {
  image: "Image",
  video: "Video",
};

export function AssetUploader({
  assetType,
  onDone,
}: {
  assetType: AssetType;
  onDone?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus("Uploading…");
    try {
      const blob = await upload(`assets/${assetType}s/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/asset",
        contentType: file.type,
      });
      setStatus("Saving…");
      const result = await createContentAsset({
        name: file.name.replace(/\.[^.]+$/, ""),
        assetType,
        url: blob.url,
        mimeType: file.type,
        size: file.size,
      });
      if (result.error) {
        setStatus(`Error: ${result.error}`);
        return;
      }
      setStatus(null);
      onDone?.();
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : "Upload failed."}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const Icon = assetType === "image" ? ImageIcon : Video;

  return (
    <div className="rounded-lg border border-dashed border-outline-variant/60 bg-card p-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <Icon className="size-8 text-on-surface-variant/40" />
        <div>
          <p className="text-sm font-medium text-on-surface">
            Upload {LABEL[assetType]}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {assetType === "image"
              ? "JPG, PNG, WebP, GIF, SVG, AVIF — up to 100 MB"
              : "MP4, WebM, MOV, AVI — up to 100 MB"}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[assetType]}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {status && <p className="text-xs text-on-surface-variant">{status}</p>}
      </div>
    </div>
  );
}
