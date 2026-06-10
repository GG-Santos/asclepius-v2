"use client";

import { Box } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PickerModel = { slug: string; name: string; posterUrl: string | null };

export function ModelPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (slug: string) => void;
}) {
  const [models, setModels] = useState<PickerModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/models")
      .then((r) => r.json())
      .then((d: PickerModel[]) => setModels(Array.isArray(d) ? d : []))
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert a 3D model</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            Loading…
          </p>
        ) : models.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            No public models yet. Publish one in Dashboard → 3D Models.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {models.map((m) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => {
                  onPick(m.slug);
                  onOpenChange(false);
                }}
                className="group overflow-hidden rounded-lg border border-outline-variant/60 bg-card text-left transition-colors hover:border-accent"
              >
                <div className="flex aspect-video items-center justify-center bg-surface-highest">
                  {m.posterUrl ? (
                    // biome-ignore lint/performance/noImgElement: blob poster on arbitrary domain
                    <img
                      src={m.posterUrl}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Box className="size-6 text-on-surface-variant/40" />
                  )}
                </div>
                <div className="truncate px-2 py-1.5 text-xs font-medium text-on-surface">
                  {m.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
