// Artifact template config — shared types for the certificate / license ID
// customization system. The BUILT-IN DEFAULTS render the untouched static
// artwork (pixel parity); a saved template overrides pieces of it:
//   - layerReplacements: any enumerated static layer swapped wholesale for an
//     uploaded (sanitized) image. QR-logo layers are never replaceable.
//   - textOverrides: an enumerated text element suppresses its baked static
//     layer and renders live SVG text at the measured anchor instead.
//   - overlayColors: fill colors for the always-dynamic overlays (name, dates,
//     LCN). Colors apply ONLY to live-rendered text — never to artwork files.

export type ArtifactId = "certificate" | "license-front" | "license-back";

/** Always-dynamic text overlays whose fill color is configurable. */
export type OverlayColorKey =
  | "cert-name"
  | "cert-body"
  | "cert-lcn"
  | "license-name"
  | "license-lcn"
  | "license-dates";

export interface TextElementSpec {
  /** Stable id, e.g. "cert-center-name". */
  id: string;
  artifact: ArtifactId;
  /** Editor label. */
  label: string;
  /**
   * Static artwork file suppressed when this element is overridden.
   * Empty string = the element is already dynamic JSX text (certificate
   * body address lines) and has no layer to suppress.
   */
  suppressesLayer: string;
  /** Text anchor: x = alignment point, y = first-line baseline (canvas units). */
  anchor: { x: number; y: number };
  align: "start" | "middle" | "end";
  /** Declared close web-font stack — baked originals are vector outlines. */
  fontFamily: string;
  fontSize: number;
  fontWeight?: "bold";
  fontStyle?: "italic";
  /** Max rendered width in canvas units; longer text auto-shrinks to fit. */
  maxWidth: number;
  /** Hard input limit (characters per line). */
  maxLength: number;
  /** Multi-line elements (address blocks): max lines + line height. */
  multiline?: { maxLines: number; lineHeight: number };
  defaultColor: string;
  /** Editor prefill — what the baked artwork currently says. */
  defaultText: string;
}

export interface ReplaceableLayerSpec {
  /** Layer file name, e.g. "02-main-logo-watermark.svg" (unique per artifact). */
  file: string;
  artifact: ArtifactId;
  label: string;
  kind: "logo" | "text-art" | "decor";
}

export interface LayerReplacement {
  /** Same-app URL of the SANITIZED asset copy — never the raw upload URL. */
  url: string;
  contentType: "image/svg+xml" | "image/png";
}

export interface TextOverride {
  /** Override text; lines separated by \n for multiline elements. */
  text?: string;
  /** Fill color (hex) — applies to the live-rendered text only. */
  color?: string;
}

/** The persisted payload of one ArtifactTemplateVersion. */
export interface ArtifactTemplateConfig {
  schemaVersion: 1;
  /** Keyed by TextElementSpec.id. */
  textOverrides: Record<string, TextOverride>;
  /** Keyed by OverlayColorKey. */
  overlayColors: Partial<Record<OverlayColorKey, string>>;
  /** Keyed by "<artifact>/<file>". */
  layerReplacements: Record<string, LayerReplacement>;
}

export const EMPTY_TEMPLATE_CONFIG: ArtifactTemplateConfig = {
  schemaVersion: 1,
  textOverrides: {},
  overlayColors: {},
  layerReplacements: {},
};
