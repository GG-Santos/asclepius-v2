// Pure validation of a template config payload before persistence. Safe to
// import from server actions and test scripts.
import {
  OVERLAY_COLOR_DEFAULTS,
  PROTECTED_LAYERS,
  REPLACEABLE_LAYERS,
  TEXT_ELEMENTS,
} from "./defaults";
import type { ArtifactId, ArtifactTemplateConfig } from "./types";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const REPLACEABLE_KEYS = new Set(
  REPLACEABLE_LAYERS.map((l) => `${l.artifact}/${l.file}`),
);
const TEXT_IDS = new Map(TEXT_ELEMENTS.map((e) => [e.id, e]));
const OVERLAY_KEYS = new Set(Object.keys(OVERLAY_COLOR_DEFAULTS));

/**
 * Validate a parsed config. `isAllowedAssetUrl` must return true only for
 * URLs produced by the server-side sanitize-and-persist pipeline — raw
 * client upload URLs are rejected.
 */
export function validateTemplateConfig(
  config: ArtifactTemplateConfig,
  isAllowedAssetUrl: (url: string) => boolean,
): string[] {
  const errors: string[] = [];
  if (config.schemaVersion !== 1) {
    errors.push("Unsupported config schema version.");
    return errors;
  }

  for (const [id, override] of Object.entries(config.textOverrides)) {
    const spec = TEXT_IDS.get(id);
    if (!spec) {
      errors.push(`Unknown text element "${id}".`);
      continue;
    }
    if (override.text !== undefined) {
      const lines = override.text.split("\n");
      const maxLines = spec.multiline?.maxLines ?? 1;
      if (lines.length > maxLines) {
        errors.push(`${spec.label}: at most ${maxLines} line(s).`);
      }
      for (const line of lines) {
        if (line.length > spec.maxLength) {
          errors.push(
            `${spec.label}: line exceeds ${spec.maxLength} characters.`,
          );
          break;
        }
      }
    }
    if (override.color !== undefined && !HEX_COLOR.test(override.color)) {
      errors.push(`${spec.label}: color must be a 6-digit hex value.`);
    }
  }

  for (const [key, color] of Object.entries(config.overlayColors)) {
    if (!OVERLAY_KEYS.has(key)) {
      errors.push(`Unknown overlay color "${key}".`);
    } else if (color !== undefined && !HEX_COLOR.test(color)) {
      errors.push(`Overlay ${key}: color must be a 6-digit hex value.`);
    }
  }

  for (const [key, replacement] of Object.entries(config.layerReplacements)) {
    if (!REPLACEABLE_KEYS.has(key)) {
      errors.push(`Layer "${key}" is not replaceable.`);
      continue;
    }
    const [artifact, file] = key.split("/", 2) as [ArtifactId, string];
    if (PROTECTED_LAYERS[artifact]?.includes(file)) {
      errors.push(`Layer "${key}" is protected (QR reliability).`);
      continue;
    }
    if (
      replacement.contentType !== "image/svg+xml" &&
      replacement.contentType !== "image/png"
    ) {
      errors.push(`Layer "${key}": only SVG or PNG replacements.`);
    }
    if (!replacement.url || !isAllowedAssetUrl(replacement.url)) {
      errors.push(
        `Layer "${key}": asset must come from the sanitized template-asset pipeline.`,
      );
    }
  }

  return errors;
}
