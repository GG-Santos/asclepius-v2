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
  updateBatchGalleryImage,
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
import {
  type BatchGalleryItem,
  normalizeGalleryItems,
} from "@/lib/batch-gallery";

export type AssetOption = { id: string; name: string; url: string };

type PickTarget = "hero" | "gallery";

const MAX_SIDE = 2560;
const HERO_ASPECT = 16 / 9;
const GALLERY_DEFAULT_ASPECT = 4 / 3;

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
  galleryItems,
  assets,
}: {
  batchId: string;
  heroImageUrl: string | null;
  galleryUrls: string[];
  galleryItems?: unknown;
  assets: AssetOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickerFor, setPickerFor] = useState<PickTarget | null>(null);
  const [heroUrlInput, setHeroUrlInput] = useState("");
  const [galleryUrlInput, setGalleryUrlInput] = useState("");
  const [galleryTitleInput, setGalleryTitleInput] = useState("");
  const [galleryDateInput, setGalleryDateInput] = useState("");
  const [galleryCaptionInput, setGalleryCaptionInput] = useState("");
  const heroFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  // Hero crop dialog (drag to position, zoom — same UX as photo uploads).
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<PickTarget>("hero");
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState(HERO_ASPECT);
  const [cropOriginalAspect, setCropOriginalAspect] = useState(
    GALLERY_DEFAULT_ASPECT,
  );

  const gallery = normalizeGalleryItems(
    galleryItems as Parameters<typeof normalizeGalleryItems>[0],
    galleryUrls,
  );

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
    if (target === "gallery") {
      fd.set("title", galleryTitleInput);
      fd.set("date", galleryDateInput);
      fd.set("caption", galleryCaptionInput);
    }
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
      setCropTarget("hero");
      setCropAspect(HERO_ASPECT);
      setCropOriginalAspect(HERO_ASPECT);
      setCropArea(null);
      setCropSrc(URL.createObjectURL(file));
      return;
    }
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalHeight > 0) {
        setCropOriginalAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
    setCropZoom(1);
    setCropTarget("gallery");
    setCropAspect(GALLERY_DEFAULT_ASPECT);
    setCropArea(null);
    setCropSrc(src);
  }

  function applyCrop() {
    if (!cropSrc || !cropArea) return;
    const src = cropSrc;
    const area = cropArea;
    const target = cropTarget;
    setCropSrc(null);
    startTransition(async () => {
      try {
        const cropped = await cropToFile(src, area);
        const url = await uploadFile(cropped);
        if (url) {
          applyUrl(
            target,
            url,
            target === "hero" ? "Hero updated." : "Image uploaded and added.",
          );
        }
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

  function saveGalleryMeta(index: number, item: BatchGalleryItem): void {
    const fd = new FormData();
    fd.set("id", batchId);
    fd.set("index", String(index));
    const title = document.getElementById(
      `gallery-title-${index}`,
    ) as HTMLInputElement | null;
    const date = document.getElementById(
      `gallery-date-${index}`,
    ) as HTMLInputElement | null;
    const caption = document.getElementById(
      `gallery-caption-${index}`,
    ) as HTMLInputElement | null;
    fd.set("title", title?.value ?? item.title);
    fd.set("date", date?.value ?? item.date);
    fd.set("caption", caption?.value ?? item.caption);
    run(() => updateBatchGalleryImage(fd), "Image details saved.");
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
            Gallery ({gallery.length}/24)
          </p>
          {gallery.length === 0 ? (
            <div className="rounded-lg border border-dashed border-outline-variant bg-surface-low/40 px-4 py-8 text-center text-sm text-on-surface-variant dark:bg-white/[0.02]">
              No gallery images yet.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {gallery.map((item, i) => (
                <li
                  key={`${item.url}-${i}`}
                  className="group overflow-hidden rounded-lg border border-outline-variant/60 bg-card dark:border-white/[0.08]"
                >
                  <div className="relative">
                    {/* biome-ignore lint/performance/noImgElement: admin media on arbitrary domains */}
                    <img
                      src={item.url}
                      alt={item.title || `Gallery ${i + 1}`}
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
                          disabled={pending || i === gallery.length - 1}
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
                        className="rounded-full bg-black/45 p-1 text-white hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="grid grid-cols-[1fr_9.5rem] gap-2">
                      <Input
                        id={`gallery-title-${i}`}
                        defaultValue={item.title}
                        placeholder="Image title"
                        className="h-9 text-xs"
                      />
                      <Input
                        id={`gallery-date-${i}`}
                        type="date"
                        defaultValue={item.date}
                        className="h-9 text-xs"
                      />
                    </div>
                    <Input
                      id={`gallery-caption-${i}`}
                      defaultValue={item.caption}
                      placeholder="Caption"
                      className="h-9 text-xs"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => saveGalleryMeta(i, item)}
                      >
                        Save details
                      </Button>
                    </div>
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
                  setGalleryTitleInput("");
                  setGalleryDateInput("");
                  setGalleryCaptionInput("");
                }}
              >
                <Link2 aria-hidden /> Add
              </Button>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_9.5rem]">
              <Input
                value={galleryTitleInput}
                onChange={(e) => setGalleryTitleInput(e.target.value)}
                placeholder="Optional title"
                className="h-9 text-sm"
              />
              <Input
                value={galleryDateInput}
                onChange={(e) => setGalleryDateInput(e.target.value)}
                type="date"
                className="h-9 text-sm"
              />
              <Input
                value={galleryCaptionInput}
                onChange={(e) => setGalleryCaptionInput(e.target.value)}
                placeholder="Optional caption"
                className="h-9 text-sm sm:col-span-2"
              />
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
                <Crop className="size-4" />{" "}
                {cropTarget === "hero"
                  ? "Frame the hero photo"
                  : "Crop the gallery photo"}
              </span>
            </DialogTitle>
          </DialogHeader>
          {cropSrc && (
            <Cropper.Root
              image={cropSrc}
              aspectRatio={cropAspect}
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
          {cropTarget === "gallery" && (
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ["4:3", GALLERY_DEFAULT_ASPECT],
                ["1:1", 1],
                ["Free", cropOriginalAspect],
              ].map(([label, aspect]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCropAspect(Number(aspect))}
                  className="rounded border border-outline-variant/60 px-2 py-1 text-on-surface-variant hover:border-accent hover:text-accent"
                >
                  {label}
                </button>
              ))}
            </div>
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
            <Button type="button" disabled={pending} onClick={applyCrop}>
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
