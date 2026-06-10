"use client";

import { ImageUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateMyAvatar } from "@/app/account/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AVATAR_SIZE = 512;

/** Center-crops the picked image to a square and re-encodes it as JPEG. */
async function cropToSquare(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read the image"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const out = Math.min(side, AVATAR_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
        "image/jpeg",
        0.9,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Avatar manager for the signed-in account: pick → center-crop square →
 * upload via /api/upload → link the asset to user.image.
 */
export function AvatarUpload({
  name,
  currentUrl,
}: {
  name: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onPick(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    startTransition(async () => {
      try {
        const cropped = await cropToSquare(file);
        if (cropped.size > 5 * 1024 * 1024) {
          toast.error("Image exceeds 5MB after processing.");
          return;
        }
        const fd = new FormData();
        fd.set(
          "file",
          new File([cropped], "avatar.jpg", { type: "image/jpeg" }),
        );
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          toast.error(body?.error ?? "Upload failed.");
          return;
        }
        const { id, url } = (await res.json()) as { id: string; url: string };
        const linked = await updateMyAvatar(id);
        if (linked.error) {
          toast.error(linked.error);
          return;
        }
        setPreview(url);
        toast.success("Avatar updated.");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not process image.",
        );
      }
    });
  }

  const shown = preview ?? currentUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageUp className="size-4 text-accent" aria-hidden />
          Avatar
        </CardTitle>
        <p className="mt-1 text-sm text-on-surface-variant">
          Shown in the user menu. Square-cropped automatically.
        </p>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Avatar
          name={name}
          src={shown}
          className="size-16 rounded-xl text-lg"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Uploading…" : shown ? "Change avatar" : "Upload avatar"}
        </Button>
      </CardContent>
    </Card>
  );
}
