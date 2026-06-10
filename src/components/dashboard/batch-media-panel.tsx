"use client";

import { Cropper } from "@origin-space/image-cropper";
import {
  ArrowLeft,
  ArrowRight,
  Crop,
  ImagePlus,
  ImageUp,
  Library,
  Link2,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addBatchGalleryImage,
  type BatchMediaState,
  moveBatchGalleryImage,
  removeBatchGalleryImage,
  setBatchHero,
} from "@/app/dashboard/batches/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type AssetOption = { id: string; name: string; url: string };

type PickTarget = "hero" | "gallery";

const MAX_SIDE = 2560;
const HERO_ASPECT = 16 / 9;

type Area = { x: number; y: number; width: number; height: number };

/** Crops the source image to the drag/zoom-selected area (natural pixels). */
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
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
      "image/jpeg",
      0.92,
    ),
  );
  return new File([blob], "hero.jpg", { type: "image/jpeg" });
}

/** Downscales to a web-sized JPEG (≤2560px long edge). Returns the original
 *  file when it is already small enough. */
async function downscaleImage(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024 && file.type !== "image/heic") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

/**
 * Admin CMS for the public cohort page media: a hero (batch group photo) and
 * an ordered gallery. Images come from the Assets library, an external URL,
 * or a direct upload (stored via /api/upload like every other photo).
 */
export function BatchMediaPanel({
  batchId,
  heroImageUrl,
  galleryUrls,
  assets,
}: {
  batchId: string;
  heroImageUrl: string | null;
  galleryUrls: string[];
  assets: AssetOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickerFor, setPickerFor] = useState<PickTarget | null>(null);
  const [heroUrlInput, setHeroUrlInput] = useState("");
  const [galleryUrlInput, setGalleryUrlInput] = useState("");
  const heroFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  // Hero crop dialog (drag to position, zoom — same UX as photo uploads).
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [cropZoom, setCropZoom] = useState(1);

  function run(action: () => Promise<BatchMediaState>, success: string) {
    startTransition(async () => {
      try {
        const res = await action();
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(success);
        router.refresh();
      } catch {
        toast.error("Something went wrong.");
      }
    });
  }

  async function uploadFile(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return null;
    }
    let payload: File = file;
    try {
      // Group photos are routinely >5MB (the upload route's cap). Downscale
      // to a web-sized JPEG client-side; display never needs more.
      payload = await downscaleImage(file);
    } catch {
      // Decode failed (HEIC etc.) — try the original; the route will judge.
    }
    if (payload.size > 5 * 1024 * 1024) {
      toast.error("Image is too large even after compression (5MB cap).");
      return null;
    }
    const fd = new FormData();
    fd.set("file", payload);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(body?.error ?? "Upload failed.");
      return null;
    }
    const { url } = (await res.json()) as { url: string };
    return url;
  }

  function applyUrl(target: PickTarget, url: string, success: string) {
    const fd = new FormData();
    fd.set("id", batchId);
    fd.set("url", url);
    run(
      () => (target === "hero" ? setBatchHero(fd) : addBatchGalleryImage(fd)),
      success,
    );
  }

  function onPickFile(target: PickTarget, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    if (target === "hero") {
      // Hero goes through the 16:9 crop dialog first — the admin frames the
      // shot, so nobody gets cut off at display time.
      setCropZoom(1);
      setCropArea(null);
      setCropSrc(URL.createObjectURL(file));
      return;
    }
    startTransition(async () => {
      const url = await uploadFile(file);
      if (url) applyUrl(target, url, "Image uploaded and applied.");
    });
  }

  function applyHeroCrop() {
    if (!cropSrc || !cropArea) return;
    const src = cropSrc;
    const area = cropArea;
    setCropSrc(null);
    startTransition(async () => {
      try {
        const cropped = await cropToFile(src, area);
        const url = await uploadFile(cropped);
        if (url) applyUrl("hero", url, "Hero updated.");
      } catch {
        toast.error("Could not crop the image.");
      } finally {
        URL.revokeObjectURL(src);
      }
    });
  }

  function galleryItemAction(
    index: number,
    kind: "remove" | "up" | "down",
  ): void {
    const fd = new FormData();
    fd.set("id", batchId);
    fd.set("index", String(index));
    if (kind === "remove") {
      run(() => removeBatchGalleryImage(fd), "Image removed.");
    } else {
      fd.set("dir", kind);
      run(() => moveBatchGalleryImage(fd), "Order updated.");
    }
  }

  const sourceButtons = (target: PickTarget, fileRef: typeof heroFileRef) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
      >
        <ImageUp aria-hidden /> Upload
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || assets.length === 0}
        onClick={() => setPickerFor(target)}
        title={
          assets.length === 0 ? "No images in the Assets library" : undefined
        }
      >
        <Library aria-hidden /> From assets
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImagePlus className="size-4 text-accent" aria-hidden />
          Public cohort media
        </CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">
          Shown on the public cohort page — a hero photo of the batch and a
          gallery. Use Assets-library files, a URL, or upload directly.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hidden file inputs */}
        <input
          ref={heroFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile("hero", f);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile("gallery", f);
            e.target.value = "";
          }}
        />

        {/* Hero */}
        <section className="space-y-3">
          <p className="text-label-caps text-on-surface-variant">Hero photo</p>
          {heroImageUrl ? (
            <div className="relative overflow-hidden rounded-lg border border-outline-variant/60 dark:border-white/[0.08]">
              {/* biome-ignore lint/performance/noImgElement: admin media on arbitrary domains */}
              <img
                src={heroImageUrl}
                alt="Cohort hero"
                className="aspect-video w-full object-cover"
              />
              <button
                type="button"
                disabled={pending}
                title="Remove hero"
                onClick={() => {
                  const fd = new FormData();
                  fd.set("id", batchId);
                  fd.set("url", "");
                  run(() => setBatchHero(fd), "Hero removed.");
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="size-4" aria-hidden />
                <span className="sr-only">Remove hero</span>
              </button>
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-low/40 text-sm text-on-surface-variant dark:bg-white/[0.02]">
              No hero photo yet
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {sourceButtons("hero", heroFileRef)}
            <div className="flex min-w-[220px] flex-1 items-center gap-2">
              <Input
                value={heroUrlInput}
                onChange={(e) => setHeroUrlInput(e.target.value)}
                placeholder="https://… image URL"
                className="h-9 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || !heroUrlInput.trim()}
                onClick={() => {
                  applyUrl("hero", heroUrlInput.trim(), "Hero updated.");
                  setHeroUrlInput("");
                }}
              >
                <Link2 aria-hidden /> Set
              </Button>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="space-y-3">
          <p className="text-label-caps text-on-surface-variant">
            Gallery ({galleryUrls.length}/24)
          </p>
          {galleryUrls.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant bg-surface-low/40 px-4 py-8 text-center text-sm text-on-surface-variant dark:bg-white/[0.02]">
              No gallery images yet.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {galleryUrls.map((url, i) => (
                <li
                  key={url}
                  className="group relative overflow-hidden rounded-lg border border-outline-variant/60 dark:border-white/[0.08]"
                >
                  {/* biome-ignore lint/performance/noImgElement: admin media on arbitrary domains */}
                  <img
                    src={url}
                    alt={`Gallery ${i + 1}`}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={pending || i === 0}
                        title="Move earlier"
                        onClick={() => galleryItemAction(i, "up")}
                        className="rounded p-1 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
                      >
                        <ArrowLeft className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={pending || i === galleryUrls.length - 1}
                        title="Move later"
                        onClick={() => galleryItemAction(i, "down")}
                        className="rounded p-1 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
                      >
                        <ArrowRight className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      title="Remove from gallery"
                      onClick={() => galleryItemAction(i, "remove")}
                      className="rounded p-1 text-white hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {sourceButtons("gallery", galleryFileRef)}
            <div className="flex min-w-[220px] flex-1 items-center gap-2">
              <Input
                value={galleryUrlInput}
                onChange={(e) => setGalleryUrlInput(e.target.value)}
                placeholder="https://… image URL"
                className="h-9 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || !galleryUrlInput.trim()}
                onClick={() => {
                  applyUrl(
                    "gallery",
                    galleryUrlInput.trim(),
                    "Added to gallery.",
                  );
                  setGalleryUrlInput("");
                }}
              >
                <Link2 aria-hidden /> Add
              </Button>
            </div>
          </div>
        </section>
      </CardContent>

      {/* Hero crop dialog — drag to position, zoom to frame (16:9). */}
      <Dialog
        open={cropSrc !== null}
        onOpenChange={(open) => {
          if (!open && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <Crop className="size-4" /> Frame the hero photo
              </span>
            </DialogTitle>
          </DialogHeader>
          {cropSrc && (
            <Cropper.Root
              image={cropSrc}
              aspectRatio={HERO_ASPECT}
              cropPadding={0}
              zoom={cropZoom}
              onZoomChange={setCropZoom}
              onCropChange={setCropArea}
              className="relative aspect-video w-full overflow-hidden rounded-md bg-inverse-surface"
            >
              <Cropper.Image className="h-full w-full object-cover" />
              <Cropper.CropArea className="border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </Cropper.Root>
          )}
          <label className="flex items-center gap-3 text-xs text-on-surface-variant">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={cropZoom}
              onChange={(e) => setCropZoom(Number(e.target.value))}
              className="flex-1 accent-[var(--color-accent)]"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (cropSrc) URL.revokeObjectURL(cropSrc);
                setCropSrc(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={applyHeroCrop}>
              Apply crop
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assets-library picker */}
      <Dialog
        open={pickerFor !== null}
        onOpenChange={(open) => {
          if (!open) setPickerFor(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pick from assets {pickerFor === "hero" ? "— hero" : "— gallery"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={pending}
                title={a.name}
                onClick={() => {
                  const target = pickerFor;
                  setPickerFor(null);
                  if (target)
                    applyUrl(
                      target,
                      a.url,
                      target === "hero" ? "Hero updated." : "Added to gallery.",
                    );
                }}
                className="group overflow-hidden rounded-lg border border-outline-variant/60 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.08]"
              >
                {/* biome-ignore lint/performance/noImgElement: admin media on arbitrary domains */}
                <img
                  src={a.url}
                  alt={a.name}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="block truncate px-1.5 py-1 text-left text-[11px] text-on-surface-variant group-hover:text-on-surface">
                  {a.name}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
