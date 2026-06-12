// Pure resolution helpers — merge a saved ArtifactTemplateConfig (or null)
// over the built-in defaults. Safe to import from server and client code.
import {
  ART_BASE,
  OVERLAY_COLOR_DEFAULTS,
  PROTECTED_LAYERS,
  REPLACEABLE_LAYERS,
  TEXT_ELEMENTS,
} from "./defaults";
import {
  type ArtifactId,
  type ArtifactTemplateConfig,
  EMPTY_TEMPLATE_CONFIG,
  type OverlayColorKey,
  type TextElementSpec,
} from "./types";

export interface ResolvedTemplate {
  config: ArtifactTemplateConfig;
}

/** Parse a persisted config JSON value; malformed input resolves to defaults. */
export function parseTemplateConfig(value: unknown): ArtifactTemplateConfig {
  if (!value || typeof value !== "object") return EMPTY_TEMPLATE_CONFIG;
  const v = value as Partial<ArtifactTemplateConfig>;
  if (v.schemaVersion !== 1) return EMPTY_TEMPLATE_CONFIG;
  return {
    schemaVersion: 1,
    textOverrides:
      v.textOverrides && typeof v.textOverrides === "object"
        ? v.textOverrides
        : {},
    overlayColors:
      v.overlayColors && typeof v.overlayColors === "object"
        ? v.overlayColors
        : {},
    layerReplacements:
      v.layerReplacements && typeof v.layerReplacements === "object"
        ? v.layerReplacements
        : {},
  };
}

export function resolveTemplate(
  config: ArtifactTemplateConfig | null,
): ResolvedTemplate {
  return { config: config ?? EMPTY_TEMPLATE_CONFIG };
}

export const DEFAULT_TEMPLATE: ResolvedTemplate = resolveTemplate(null);

const replaceableSet = new Set(
  REPLACEABLE_LAYERS.map((l) => `${l.artifact}/${l.file}`),
);

/**
 * Source URL for a static layer: the sanitized replacement when one is
 * configured for a replaceable layer, otherwise the built-in artwork file.
 * Protected layers (QR logos) always resolve to the built-in file.
 */
export function layerSrc(
  t: ResolvedTemplate,
  artifact: ArtifactId,
  file: string,
): string {
  const key = `${artifact}/${file}`;
  if (replaceableSet.has(key) && !PROTECTED_LAYERS[artifact].includes(file)) {
    const replacement = t.config.layerReplacements[key];
    if (replacement?.url) return replacement.url;
  }
  return `${ART_BASE[artifact]}/${file}`;
}

export interface ResolvedTextOverride {
  spec: TextElementSpec;
  text: string;
  color: string;
  /** Auto-fit font size so the longest line stays within spec.maxWidth. */
  fontSize: number;
  lines: string[];
}

/**
 * The active override for a text element, or null when the element keeps its
 * baked default artwork. An override exists when override.text is a non-empty
 * string OR a color is set (color-only override forces the live-text path —
 * artwork files are never recolored — using the element's default text).
 */
export function textOverrideFor(
  t: ResolvedTemplate,
  elementId: string,
): ResolvedTextOverride | null {
  const spec = TEXT_ELEMENTS.find((e) => e.id === elementId);
  if (!spec) return null;
  const o = t.config.textOverrides[elementId];
  const text = o?.text?.trim() ? o.text : null;
  const color = o?.color ?? null;
  if (text === null && color === null) return null;
  const effective = text ?? spec.defaultText;
  if (!effective) return null; // no text to render (e.g. color set on empty signatory)
  const maxLines = spec.multiline?.maxLines ?? 1;
  const lines = effective
    .split("\n")
    .map((l) => l.slice(0, spec.maxLength))
    .filter((l) => l.length > 0)
    .slice(0, maxLines);
  if (lines.length === 0) return null;
  // Auto-fit: approximate glyph advance at 0.6em; shrink to keep the longest
  // line inside maxWidth, floored at 40% of the spec size.
  const longest = Math.max(...lines.map((l) => l.length));
  const estimated = longest * spec.fontSize * 0.6;
  const fontSize =
    estimated > spec.maxWidth
      ? Math.max(
          Math.floor((spec.maxWidth / (longest * 0.6)) | 0),
          Math.floor(spec.fontSize * 0.4),
        )
      : spec.fontSize;
  return {
    spec,
    text: effective,
    color: color ?? spec.defaultColor,
    fontSize,
    lines,
  };
}

/**
 * The active override that suppresses a baked static text layer, or null when
 * the layer renders its default artwork.
 */
export function suppressedOverride(
  t: ResolvedTemplate,
  artifact: ArtifactId,
  file: string,
): ResolvedTextOverride | null {
  const element = TEXT_ELEMENTS.find(
    (e) => e.artifact === artifact && e.suppressesLayer === file,
  );
  if (!element) return null;
  return textOverrideFor(t, element.id);
}

export function overlayColor(
  t: ResolvedTemplate,
  key: OverlayColorKey,
): string {
  return t.config.overlayColors[key] ?? OVERLAY_COLOR_DEFAULTS[key];
}
