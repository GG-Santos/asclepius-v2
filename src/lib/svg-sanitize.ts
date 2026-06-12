// Template-asset safety: uploaded replacement layers render on the PUBLIC
// verify page, so SVG content is a stored-XSS surface. The attach-asset
// action fetches the uploaded bytes server-side, validates the real type by
// magic numbers, sanitizes SVG markup, and persists only the sanitized copy.
import DOMPurify from "isomorphic-dompurify";

export type TemplateAssetType = "image/svg+xml" | "image/png";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Identify the asset type from its bytes — never trust the client-declared
 * content type. Returns null for anything that is not PNG or SVG.
 */
export function sniffTemplateAsset(
  bytes: Uint8Array,
): TemplateAssetType | null {
  if (
    bytes.length > PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((b, i) => bytes[i] === b)
  ) {
    return "image/png";
  }
  // SVG: text starting with an <svg root (allowing BOM, xml decl, comments).
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, 4096))
    .replace(/^﻿/, "")
    .trimStart();
  if (
    /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(
      head,
    )
  ) {
    return "image/svg+xml";
  }
  return null;
}

/**
 * Sanitize SVG markup: strips scripts, event handlers, foreignObject, and
 * external references. Throws when the result no longer contains an <svg>
 * root (i.e. the input was not really an SVG document).
 */
export function sanitizeSvg(markup: string): string {
  const clean = DOMPurify.sanitize(markup, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["foreignObject", "script", "use", "animate", "set"],
    FORBID_ATTR: ["href", "xlink:href"],
  });
  if (!/<svg[\s>]/i.test(clean)) {
    throw new Error("File is not a valid SVG document.");
  }
  return clean;
}
