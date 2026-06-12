"use client";

import { upload } from "@vercel/blob/client";
import { Loader2, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  attachTemplateAsset,
  resetArtifactTemplate,
  saveArtifactTemplate,
} from "@/app/dashboard/settings/template-actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Certificate } from "@/components/verify/certificate";
import { LicenseCard } from "@/components/verify/license-card";
import { LicenseCardBack } from "@/components/verify/license-card-back";
import {
  OVERLAY_COLOR_DEFAULTS,
  OVERLAY_COLOR_LABELS,
  REPLACEABLE_LAYERS,
  TEXT_ELEMENTS,
} from "@/lib/artifact-template/defaults";
import { resolveTemplate } from "@/lib/artifact-template/resolve";
import type {
  ArtifactId,
  ArtifactTemplateConfig,
  OverlayColorKey,
} from "@/lib/artifact-template/types";
import { cn } from "@/lib/utils";

const ARTIFACT_TABS: { id: ArtifactId; label: string }[] = [
  { id: "certificate", label: "Certificate" },
  { id: "license-front", label: "ID — front" },
  { id: "license-back", label: "ID — back" },
];

const OVERLAYS_BY_ARTIFACT: Record<ArtifactId, OverlayColorKey[]> = {
  certificate: ["cert-name", "cert-body", "cert-lcn"],
  "license-front": ["license-name", "license-lcn", "license-dates"],
  "license-back": [],
};

/* Sample record for the live preview — draft only, nothing persists. */
const SAMPLE = {
  name: "Juan Dela Cruz",
  lcn: "A15-251201",
  issued: "August 03, 2025",
  expiration: "August 03, 2026",
};

export function TemplateEditor({
  initialConfig,
}: {
  initialConfig: ArtifactTemplateConfig;
}) {
  const [draft, setDraft] = useState<ArtifactTemplateConfig>(initialConfig);
  const [artifact, setArtifact] = useState<ArtifactId>("certificate");
  const [pending, startTransition] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingLayerKey = useRef<string | null>(null);

  const resolved = useMemo(() => resolveTemplate(draft), [draft]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialConfig),
    [draft, initialConfig],
  );

  function patchText(id: string, patch: { text?: string; color?: string }) {
    setDraft((d) => {
      const current = { ...(d.textOverrides[id] ?? {}), ...patch };
      if (!current.text?.trim()) delete current.text;
      if (!current.color) delete current.color;
      const textOverrides = { ...d.textOverrides };
      if (Object.keys(current).length === 0) delete textOverrides[id];
      else textOverrides[id] = current;
      return { ...d, textOverrides };
    });
  }

  function patchOverlay(key: OverlayColorKey, color: string | null) {
    setDraft((d) => {
      const overlayColors = { ...d.overlayColors };
      if (color) overlayColors[key] = color;
      else delete overlayColors[key];
      return { ...d, overlayColors };
    });
  }

  function clearLayer(key: string) {
    setDraft((d) => {
      const layerReplacements = { ...d.layerReplacements };
      delete layerReplacements[key];
      return { ...d, layerReplacements };
    });
  }

  async function handleLayerFile(file: File) {
    const key = pendingLayerKey.current;
    if (!key) return;
    setUploadingKey(key);
    try {
      const blob = await upload(`template-uploads/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/asset",
        contentType: file.type,
      });
      const fd = new FormData();
      fd.set("uploadUrl", blob.url);
      const result = await attachTemplateAsset({}, fd);
      if (!result.ok || !result.url || !result.contentType) {
        toast.error(result.error ?? "Upload failed.");
        return; // draft unchanged (R8)
      }
      const url = result.url;
      const contentType = result.contentType;
      setDraft((d) => ({
        ...d,
        layerReplacements: {
          ...d.layerReplacements,
          [key]: { url, contentType },
        },
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadingKey(null);
      pendingLayerKey.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("config", JSON.stringify(draft));
      const result = await saveArtifactTemplate({}, fd);
      if (result.ok) toast.success("Template saved — live on all artifacts.");
      else toast.error(result.error ?? "Save failed.");
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetArtifactTemplate({}, new FormData());
      if (result.ok) {
        setDraft({
          schemaVersion: 1,
          textOverrides: {},
          overlayColors: {},
          layerReplacements: {},
        });
        toast.success("Template reset to the built-in defaults.");
      } else {
        toast.error(result.error ?? "Reset failed.");
      }
    });
  }

  const textElements = TEXT_ELEMENTS.filter((e) => e.artifact === artifact);
  const layers = REPLACEABLE_LAYERS.filter((l) => l.artifact === artifact);
  const overlays = OVERLAYS_BY_ARTIFACT[artifact];

  return (
    <div className="space-y-4">
      {/* Hidden file input shared by all layer upload buttons. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/svg+xml,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleLayerFile(file);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-outline-variant/60 p-1 dark:border-white/[0.08]">
          {ARTIFACT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setArtifact(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                artifact === t.id
                  ? "bg-accent/10 text-accent"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs font-medium text-warning">
              Unsaved changes
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw aria-hidden /> Reset to defaults
          </Button>
          <Button size="sm" disabled={pending || !dirty} onClick={save}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Save template
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,26rem)_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          {textElements.length > 0 && (
            <Card>
              <CardContent className="space-y-4 p-4">
                <h3 className="text-label-caps text-on-surface-variant">
                  Text
                </h3>
                {textElements.map((spec) => {
                  const override = draft.textOverrides[spec.id] ?? {};
                  return (
                    <div key={spec.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-on-surface">
                          {spec.label}
                        </span>
                        <input
                          type="color"
                          aria-label={`${spec.label} color`}
                          value={override.color ?? spec.defaultColor}
                          onChange={(e) =>
                            patchText(spec.id, { color: e.target.value })
                          }
                          className="size-6 cursor-pointer rounded border border-outline-variant/60 bg-transparent"
                        />
                      </div>
                      {spec.multiline ? (
                        <textarea
                          rows={spec.multiline.maxLines}
                          maxLength={
                            (spec.maxLength + 1) * spec.multiline.maxLines
                          }
                          placeholder={spec.defaultText || "Default artwork"}
                          value={override.text ?? ""}
                          onChange={(e) =>
                            patchText(spec.id, { text: e.target.value })
                          }
                          className="w-full rounded-md border border-outline-variant/70 bg-surface-low px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.08]"
                        />
                      ) : (
                        <Input
                          maxLength={spec.maxLength}
                          placeholder={spec.defaultText || "Default artwork"}
                          value={override.text ?? ""}
                          onChange={(e) =>
                            patchText(spec.id, { text: e.target.value })
                          }
                        />
                      )}
                      {(override.text || override.color) && (
                        <button
                          type="button"
                          onClick={() =>
                            patchText(spec.id, {
                              text: undefined,
                              color: undefined,
                            })
                          }
                          className="mt-1 text-xs text-on-surface-variant hover:text-accent"
                        >
                          Use default
                        </button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {overlays.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h3 className="text-label-caps text-on-surface-variant">
                  Record text colors
                </h3>
                {overlays.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-on-surface">
                      {OVERLAY_COLOR_LABELS[key]}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label={`${OVERLAY_COLOR_LABELS[key]} color`}
                        value={
                          draft.overlayColors[key] ??
                          OVERLAY_COLOR_DEFAULTS[key]
                        }
                        onChange={(e) => patchOverlay(key, e.target.value)}
                        className="size-6 cursor-pointer rounded border border-outline-variant/60 bg-transparent"
                      />
                      {draft.overlayColors[key] && (
                        <button
                          type="button"
                          onClick={() => patchOverlay(key, null)}
                          className="text-xs text-on-surface-variant hover:text-accent"
                        >
                          Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-2 p-4">
              <h3 className="text-label-caps text-on-surface-variant">
                Artwork layers
              </h3>
              <p className="text-xs text-on-surface-variant">
                Replace any layer with an uploaded SVG or PNG (sanitized,
                rendered at the layer's exact position). QR layers are
                protected.
              </p>
              <ul className="divide-y divide-outline-variant/40 dark:divide-white/[0.06]">
                {layers.map((layer) => {
                  const key = `${layer.artifact}/${layer.file}`;
                  const replaced = Boolean(draft.layerReplacements[key]);
                  const uploading = uploadingKey === key;
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-2 py-1.5"
                    >
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-xs",
                            replaced
                              ? "font-semibold text-accent"
                              : "text-on-surface",
                          )}
                        >
                          {layer.label}
                          {replaced ? " · replaced" : ""}
                        </span>
                        <span className="block text-[10px] text-on-surface-variant">
                          {layer.kind}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          title={`Upload replacement for ${layer.label}`}
                          disabled={uploadingKey !== null}
                          onClick={() => {
                            pendingLayerKey.current = key;
                            fileInputRef.current?.click();
                          }}
                          className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-accent disabled:opacity-50"
                        >
                          {uploading ? (
                            <Loader2
                              className="size-3.5 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <UploadCloud className="size-3.5" aria-hidden />
                          )}
                        </button>
                        {replaced && (
                          <button
                            type="button"
                            title="Remove replacement"
                            onClick={() => clearLayer(key)}
                            className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-secondary/10 hover:text-secondary"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Live preview — same render components as production surfaces. */}
        <div className="min-w-0">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-label-caps text-on-surface-variant">
                Live preview — sample record
              </h3>
              {artifact === "certificate" && (
                <Certificate
                  name={SAMPLE.name}
                  lcn={SAMPLE.lcn}
                  issued={SAMPLE.issued}
                  photoUrl={null}
                  template={resolved}
                />
              )}
              {artifact === "license-front" && (
                <LicenseCard
                  name={SAMPLE.name}
                  lcn={SAMPLE.lcn}
                  issued={SAMPLE.issued}
                  expiration={SAMPLE.expiration}
                  photoUrl={null}
                  template={resolved}
                />
              )}
              {artifact === "license-back" && (
                <LicenseCardBack qrDataUrl={null} template={resolved} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset template to defaults?"
        description="All artifacts return to the built-in artwork. A new version is recorded — history is kept."
        confirmLabel="Reset"
        tone="danger"
        pending={pending}
        onConfirm={() => {
          setConfirmReset(false);
          reset();
        }}
      />
    </div>
  );
}
