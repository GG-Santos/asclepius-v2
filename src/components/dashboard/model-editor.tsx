"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  type ModelHotspot,
  updateModelDisplay,
} from "@/app/dashboard/models/actions";
import { ModelViewerFrame } from "@/components/model-viewer-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ENV_PRESETS = [
  "city",
  "studio",
  "sunset",
  "dawn",
  "night",
  "warehouse",
  "forest",
  "apartment",
  "lobby",
  "park",
];

export function ModelEditor({
  model,
}: {
  model: {
    id: string;
    name: string;
    description: string | null;
    fileUrl: string;
    environment: string;
    autoRotate: boolean;
    hotspots: ModelHotspot[];
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(model.name);
  const [description, setDescription] = useState(model.description ?? "");
  const [environment, setEnvironment] = useState(model.environment);
  const [autoRotate, setAutoRotate] = useState(model.autoRotate);
  const [hotspots, setHotspots] = useState<ModelHotspot[]>(model.hotspots);
  const [saving, setSaving] = useState(false);

  function setPos(i: number, axis: 0 | 1 | 2, v: number) {
    setHotspots((hs) =>
      hs.map((h, idx) => {
        if (idx !== i) return h;
        const p = [...h.position] as [number, number, number];
        p[axis] = v;
        return { ...h, position: p };
      }),
    );
  }

  const valid = hotspots.filter((h) => h.label.trim());

  async function save() {
    setSaving(true);
    const res = await updateModelDisplay({
      id: model.id,
      name,
      description,
      environment,
      autoRotate,
      hotspots: valid,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Saved.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not save.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="h-[60vh] min-h-[360px]">
        <ModelViewerFrame
          url={model.fileUrl}
          environment={environment}
          autoRotate={autoRotate}
          hotspots={valid}
          className="h-full w-full"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display &amp; hotspots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-name">Name</Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <Input
              id="m-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-env">Environment</Label>
            <select
              id="m-env"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="h-11 rounded border border-outline-variant bg-card px-3 text-sm capitalize focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {ENV_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            Auto-rotate by default
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Hotspots</Label>
              <button
                type="button"
                onClick={() =>
                  setHotspots((hs) => [
                    ...hs,
                    { position: [0, 0, 0], label: "" },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Plus className="size-3.5" /> Add
              </button>
            </div>
            {hotspots.length === 0 && (
              <p className="text-xs text-on-surface-variant">
                No hotspots. Add labelled points (x / y / z in model space).
              </p>
            )}
            {hotspots.map((h, i) => (
              <div
                key={`hs-${i}-${h.label}`}
                className="space-y-1.5 rounded-md border border-outline-variant/60 p-2"
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    value={h.label}
                    onChange={(e) =>
                      setHotspots((hs) =>
                        hs.map((x, idx) =>
                          idx === i ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Label"
                    className="h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setHotspots((hs) => hs.filter((_, idx) => idx !== i))
                    }
                    className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary"
                    title="Remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([0, 1, 2] as const).map((axis) => (
                    <input
                      key={axis}
                      type="number"
                      step={0.1}
                      value={h.position[axis]}
                      onChange={(e) => setPos(i, axis, Number(e.target.value))}
                      aria-label={["x", "y", "z"][axis]}
                      className="h-8 rounded border border-outline-variant bg-card px-2 text-xs text-on-surface focus:border-accent focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            <Save className="size-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
