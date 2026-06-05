"use client";

import { Cropper } from "@origin-space/image-cropper";
import { Crop, ImagePlus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Area = { x: number; y: number; width: number; height: number };

async function cropToFile(src: string, area: Area): Promise<File> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
      0.95,
    ),
  );
  return new File([blob], "photo.png", { type: "image/png" });
}

export function PhotoUpload({
  name = "photo",
  aspectRatio = 4 / 5,
  currentUrl,
  label = "Photo",
}: {
  name?: string;
  aspectRatio?: number;
  currentUrl?: string | null;
  label?: string;
}) {
  const inputId = useId();
  // The actual file submitted with the form. We set its files programmatically.
  const submitInputRef = useRef<HTMLInputElement>(null);

  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawSrc(URL.createObjectURL(file));
    setZoom(1);
    setOpen(true);
    e.target.value = ""; // allow re-picking the same file
  }

  async function apply() {
    if (!rawSrc || !area || !submitInputRef.current) return;
    const file = await cropToFile(rawSrc, area);
    const dt = new DataTransfer();
    dt.items.add(file);
    submitInputRef.current.files = dt.files;
    setPreview(URL.createObjectURL(file));
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-[4.8rem] shrink-0 overflow-hidden rounded-md border border-outline-variant/60 bg-surface-highest">
        {preview ? (
          // biome-ignore lint/performance/noImgElement: client-side object-URL preview
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-on-surface-variant">
            No photo
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* Hidden input that is actually submitted with the form */}
        <input
          ref={submitInputRef}
          type="file"
          name={name}
          accept="image/*"
          hidden
        />
        {/* Visible picker */}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={onPick}
          hidden
        />
        <Button type="button" variant="outline" size="sm" asChild>
          <label htmlFor={inputId} className="cursor-pointer">
            <ImagePlus aria-hidden />{" "}
            {preview ? "Replace photo" : `Upload ${label.toLowerCase()}`}
          </label>
        </Button>
        <p className="text-xs text-on-surface-variant">
          Cropped to portrait and stored on Vercel Blob with a SHA-256 hash.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <Crop className="size-4" /> Crop photo
              </span>
            </DialogTitle>
          </DialogHeader>
          {rawSrc && (
            <Cropper.Root
              image={rawSrc}
              aspectRatio={aspectRatio}
              zoom={zoom}
              onZoomChange={setZoom}
              onCropChange={setArea}
              className="relative h-72 w-full overflow-hidden rounded-md bg-inverse-surface"
            >
              <Cropper.Image className="h-full w-full object-cover" />
              <Cropper.CropArea className="border-2 border-on-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </Cropper.Root>
          )}
          <label className="flex items-center gap-3 text-xs text-on-surface-variant">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[var(--color-accent)]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={apply}>
              Apply crop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
