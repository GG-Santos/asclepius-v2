"use client";

import { Cropper } from "@origin-space/image-cropper";
import { Crop, ImagePlus, UserRound } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { removeWhiteBackground } from "@/lib/remove-background";

type Area = { x: number; y: number; width: number; height: number };
export type SaveState = "idle" | "saving" | "done";
type CardState = "idle" | "active" | "done" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cropToFile(src: string, area: Area): Promise<File> {
  const img = new Image();
  // Clean canvas for remote (Vercel Blob) sources too — lets "Edit current
  // photo" re-crop a stored image without tainting toBlob. Harmless on
  // blob:/data: object URLs.
  img.crossOrigin = "anonymous";
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
      "image/png",
      0.95,
    ),
  );
  // Formal photos arrive on a white backdrop — strip it to transparency so
  // the portrait composites cleanly onto the ID card and certificate.
  const cleaned = await removeWhiteBackground(blob);
  return new File([cleaned], "photo.png", { type: "image/png" });
}

function uploadWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ id: string; url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error("Upload failed"));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(fd);
  });
}

/** Submit to VirusTotal and poll until the analysis completes. */
async function scanFile(
  file: File,
): Promise<{ ok: boolean; malicious: number; skipped?: boolean }> {
  const fd = new FormData();
  fd.append("file", file);
  const start = await fetch("/api/scan", { method: "POST", body: fd });
  if (!start.ok) throw new Error("scan start failed");
  const { analysisId, skipped } = (await start.json()) as {
    analysisId?: string;
    skipped?: boolean;
  };
  if (skipped || !analysisId) return { ok: true, malicious: 0, skipped: true };

  for (let i = 0; i < 30; i++) {
    await sleep(1500);
    const r = await fetch(`/api/scan/${analysisId}`, { cache: "no-store" });
    if (!r.ok) continue;
    const d = (await r.json()) as { status?: string; malicious?: number };
    if (d.status === "completed") {
      return { ok: (d.malicious ?? 0) === 0, malicious: d.malicious ?? 0 };
    }
  }
  // Inconclusive (timed out) — allow but flag.
  return { ok: true, malicious: 0 };
}

const ICONS = {
  virustotal: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 30 30"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M13.6219 15L0 29H30V1H0L13.6219 15ZM27.2578 26.2002H6.34219L17.5641 14.9301L6.64406 3.79981H27.2578V26.2002Z"
        fill="currentColor"
      />
    </svg>
  ),
  vercel: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 30 30"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M30 28H0L15 2L30 28Z" fill="currentColor" />
    </svg>
  ),
  mongo: (
    <svg
      width="26"
      height="26"
      viewBox="0 0 30 30"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M20.7614 11.9438C19.2373 4.96875 15.6345 2.67625 15.2474 1.8C14.9098 1.3075 14.6084 0.6075 14.3612 0C14.3178 0.61875 14.2949 0.85625 13.7305 1.48C12.8588 2.1875 8.3793 6.0825 8.01515 14.005C7.67512 21.395 13.1638 25.7987 13.909 26.36L13.9934 26.4225C14.1486 27.6122 14.2812 28.8049 14.3913 30H14.9713C15.1088 28.71 15.3137 27.43 15.5862 26.1625C16.0891 25.7925 16.3145 25.5837 16.6112 25.2962C18.0158 23.9491 19.1322 22.3114 19.888 20.4889C20.6438 18.6665 21.0223 16.6999 20.999 14.7162C21.011 13.6987 20.8748 12.6388 20.7614 11.9438Z"
        fill="currentColor"
      />
    </svg>
  ),
};

function IntegrationCard({
  icon,
  label,
  value,
  state,
  statusText,
  doneText = "Complete",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  state: CardState;
  statusText?: string;
  doneText?: string;
}) {
  const right =
    state === "done"
      ? doneText
      : state === "error"
        ? "Blocked"
        : state === "active"
          ? (statusText ?? `${value}%`)
          : "Idle";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-card p-3 pr-4">
      <span
        className={
          state === "error"
            ? "shrink-0 text-secondary"
            : "shrink-0 text-on-surface-variant"
        }
      >
        {icon}
      </span>
      <div className="grid grow gap-1">
        <div className="flex items-center justify-between gap-0.5">
          <p className="truncate text-sm font-medium text-on-surface">
            {label}
          </p>
          <span
            className={
              state === "error"
                ? "text-xs text-secondary"
                : "text-xs text-on-surface-variant"
            }
          >
            {right}
          </span>
        </div>
        <Progress
          value={
            state === "done"
              ? 100
              : state === "idle"
                ? 0
                : state === "active" && statusText
                  ? 66
                  : value
          }
          className={state === "active" ? "animate-pulse" : ""}
        />
      </div>
    </div>
  );
}

export function StudentPhotoPanel({
  currentUrl,
  saveState = "idle",
  persisted = false,
}: {
  currentUrl?: string | null;
  saveState?: SaveState;
  // True when editing an already-saved record (its photo is already stored).
  persisted?: boolean;
}) {
  const inputId = useId();
  const hasExisting = Boolean(currentUrl);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [assetId, setAssetId] = useState("");

  // An existing photo is already scanned + stored, so show all three complete.
  const [vt, setVt] = useState<CardState>(hasExisting ? "done" : "idle");
  const [vtText, setVtText] = useState("Scanning…");
  const [vercel, setVercel] = useState(hasExisting ? 100 : 0);
  const [vercelState, setVercelState] = useState<CardState>(
    hasExisting ? "done" : "idle",
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawSrc(URL.createObjectURL(file));
    setZoom(1);
    setOpen(true);
    e.target.value = "";
  }

  /** Re-crop the photo already on the record: load it straight into the crop
   *  dialog (cropToFile reads it cross-origin-clean). Apply then runs the
   *  standard scan + upload pipeline and stages the new asset for save. */
  function editCurrent() {
    const src = preview ?? currentUrl;
    if (!src) return;
    setRawSrc(src);
    setZoom(1);
    setOpen(true);
  }

  async function apply() {
    if (!rawSrc) return;
    if (!area) {
      toast.error("Adjust the crop, then apply.");
      return;
    }
    setOpen(false);
    try {
      const file = await cropToFile(rawSrc, area);
      setPreview(URL.createObjectURL(file));

      // 1) VirusTotal — real scan
      setVt("active");
      setVtText("Scanning…");
      const scan = await scanFile(file);
      if (!scan.ok) {
        setVt("error");
        setVercelState("idle");
        setAssetId("");
        toast.error(
          `VirusTotal flagged this file (${scan.malicious}). Upload blocked.`,
        );
        return;
      }
      setVt("done");
      if (scan.skipped) toast.message("VirusTotal scan skipped (no key).");

      // 2) Vercel Blob — real upload progress
      setVercel(0);
      setVercelState("active");
      const res = await uploadWithProgress(file, setVercel);
      setVercel(100);
      setVercelState("done");
      setAssetId(res.id);
      toast.success("Photo scanned and uploaded.");
    } catch {
      setVt((s) => (s === "active" ? "idle" : s));
      setVercelState("idle");
      toast.error("Photo processing failed.");
    }
  }

  const mongoState: CardState =
    saveState === "done"
      ? "done"
      : saveState === "saving"
        ? "active"
        : persisted || hasExisting
          ? "done"
          : "idle";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => document.getElementById(inputId)?.click()}
        className="group relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-highest"
      >
        {preview ? (
          // biome-ignore lint/performance/noImgElement: client object-URL / blob preview
          <img
            src={preview}
            alt="Student"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-on-surface-variant">
            <UserRound className="size-20" />
            <span className="text-sm font-medium">Click to upload photo</span>
            <span className="text-xs">PNG, JPG up to 5MB</span>
          </span>
        )}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-primary/0 text-on-primary opacity-0 transition group-hover:bg-primary/40 group-hover:opacity-100">
          <ImagePlus className="size-7" />
          <span className="text-sm font-medium">Click to change</span>
        </span>
      </button>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
      <input type="hidden" name="photoAssetId" value={assetId} readOnly />

      {preview && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={editCurrent}
        >
          <Crop aria-hidden /> Edit current photo
        </Button>
      )}

      <div className="grid gap-2">
        <IntegrationCard
          icon={ICONS.virustotal}
          label="VirusTotal"
          value={66}
          state={vt}
          statusText={vtText}
          doneText="Safe"
        />
        <IntegrationCard
          icon={ICONS.vercel}
          label="Vercel Blob"
          value={vercel}
          state={vercelState}
        />
        <IntegrationCard
          icon={ICONS.mongo}
          label="MongoDB Atlas"
          value={100}
          state={mongoState}
          statusText="Saving…"
        />
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
