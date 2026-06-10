"use client";

import { upload } from "@vercel/blob/client";
import { Box, Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createModel3d } from "@/app/dashboard/models/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { objectToGlb, parseModel } from "@/lib/model-convert";
import { renderModelPoster } from "@/lib/model-poster";

export function ModelUploader() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mtl, setMtl] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose an .fbx or .obj file.");
      return;
    }
    if (!name.trim()) {
      toast.error("Give the model a name.");
      return;
    }
    setBusy(true);
    try {
      setStatus("Reading model…");
      const object = await parseModel(file, mtl);

      setStatus("Rendering preview…");
      const posterBlob = await renderModelPoster(object);

      setStatus("Optimizing to GLB…");
      const glb = await objectToGlb(object);

      setStatus("Uploading…");
      let posterUrl: string | null = null;
      if (posterBlob) {
        const p = await upload(
          `models/posters/${Date.now()}.webp`,
          posterBlob,
          {
            access: "public",
            handleUploadUrl: "/api/upload/model",
            contentType: "image/webp",
          },
        );
        posterUrl = p.url;
      }
      const blob = await upload(`models/${Date.now()}.glb`, glb, {
        access: "public",
        handleUploadUrl: "/api/upload/model",
        contentType: "model/gltf-binary",
      });

      setStatus("Saving…");
      const res = await createModel3d({
        name: name.trim(),
        description,
        fileUrl: blob.url,
        posterUrl,
        size: glb.size,
      });
      if (res.ok) {
        toast.success("3D model added.");
        router.push("/dashboard/models");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not save the model.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Box className="size-4 text-accent" /> Upload a 3D model
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model-name">Name</Label>
            <Input
              id="model-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ambulance stretcher"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model-desc">Description (optional)</Label>
            <Input
              id="model-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short caption"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model-file">Model file (.fbx / .obj)</Label>
            <input
              id="model-file"
              type="file"
              accept=".fbx,.obj"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-on-surface-variant file:mr-3 file:rounded file:border file:border-outline-variant file:bg-card file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model-mtl">Material file (.mtl, optional)</Label>
            <input
              id="model-mtl"
              type="file"
              accept=".mtl"
              onChange={(e) => setMtl(e.target.files?.[0] ?? null)}
              className="text-sm text-on-surface-variant file:mr-3 file:rounded file:border file:border-outline-variant file:bg-card file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              {busy ? "Working…" : "Convert & upload"}
            </Button>
            {status && (
              <span className="text-sm text-on-surface-variant">{status}</span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant sm:col-span-2">
            The file is converted to a compressed GLB in your browser, then
            stored on Vercel Blob. Max 50 MB.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
