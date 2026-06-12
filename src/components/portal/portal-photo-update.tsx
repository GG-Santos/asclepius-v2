"use client";

import { Cropper } from "@origin-space/image-cropper";
import { Crop, ImagePlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateMyPhoto } from "@/app/portal/(app)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeWhiteBackground } from "@/lib/remove-background";

type Area = { x: number; y: number; width: number; height: number };

async function cropToFile(src: string, area: Area): Promise<File> {
  const img = new Image();
  img.src = src;
  await img.decode();
  // Cap output at the artifact photo-slot resolution (≤1200px wide, 4:5) —
  // full-resolution phone crops produce PNGs past the upload's 5MB limit.
  const MAX_W = 1200;
  const scale = Math.min(1, MAX_W / area.width);
  const outW = Math.round(area.width * scale);
  const outH = Math.round(area.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
      "image/png",
      0.95,
    ),
  );
  // Formal photos arrive on a white backdrop — strip it to transparency so
  // the portrait composites cleanly onto the ID card and certificate.
  const cleaned = await removeWhiteBackground(blob);
  return new File([cleaned], "photo.png", { type: "image/png" });
}

export function PortalPhotoUpdate({
  currentUrl,
}: {
  currentUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawSrc(URL.createObjectURL(file));
    setZoom(1);
    setOpen(true);
    e.target.value = "";
  }

  async function apply() {
    if (!rawSrc || !area) return;
    setOpen(false);
    start(async () => {
      try {
        const file = await cropToFile(rawSrc, area);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("upload failed");
        const { id } = (await res.json()) as { id: string };
        const result = await updateMyPhoto(id);
        if (result.ok) {
          toast.success("Photo updated.");
        } else {
          toast.error(result.error ?? "Could not update photo.");
        }
      } catch {
        toast.error("Photo update failed.");
      }
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus aria-hidden />{" "}
        {pending ? "Updating…" : currentUrl ? "Change photo" : "Add photo"}
      </Button>

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
              aspectRatio={4 / 5}
              cropPadding={0}
              zoom={zoom}
              onZoomChange={setZoom}
              onCropChange={setArea}
              className="relative mx-auto aspect-[4/5] h-[min(60svh,480px)] overflow-hidden rounded-md bg-inverse-surface"
            >
              <Cropper.Image className="h-full w-full object-cover" />
              <Cropper.CropArea className="border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </Cropper.Root>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={apply}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
