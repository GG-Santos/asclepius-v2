"use client";

import { ExternalLink, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * A text field that accepts a URL either by pasting one or by uploading a file
 * to Vercel Blob (via /api/upload/course-file). The value posts under `name`
 * with the rest of the surrounding form, so it drops into existing server
 * actions unchanged.
 */
export function UploadInput({
  name,
  defaultValue = "",
  accept,
  placeholder = "https://… or upload",
  id,
}: {
  name: string;
  defaultValue?: string;
  accept?: string;
  placeholder?: string;
  id?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/course-file", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      setUrl(data.url);
      toast.success("File uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
        />
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          onChange={onPick}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Upload aria-hidden />
          )}
          Upload
        </Button>
      </div>

      {url && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          {isImage ? (
            // biome-ignore lint/performance/noImgElement: lightweight upload preview, not page content
            <img
              src={url}
              alt="preview"
              className="size-10 rounded border border-outline-variant/60 object-cover"
            />
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate hover:text-accent"
            >
              <ExternalLink className="size-3.5" /> {url}
            </a>
          )}
          <button
            type="button"
            title="Clear"
            onClick={() => setUrl("")}
            className="rounded p-1 hover:text-secondary"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
