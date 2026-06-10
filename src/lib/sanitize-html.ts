import "server-only";
import DOMPurify from "isomorphic-dompurify";

// Only these embed providers may appear in an <iframe src>. Everything else is
// stripped — authors are trusted staff, but this is defense-in-depth.
const ALLOWED_IFRAME =
  /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i;

let hooked = false;
function ensureHook() {
  if (hooked) return;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "iframe") {
      const src = (node as Element).getAttribute?.("src") ?? "";
      if (!ALLOWED_IFRAME.test(src)) node.parentNode?.removeChild(node);
    }
  });
  hooked = true;
}

/**
 * Sanitize stored blog HTML for safe rendering. Allows standard rich-text tags
 * plus a tightly-scoped <iframe> (YouTube/Vimeo only). Strips scripts, event
 * handlers, and disallowed embeds.
 */
export function sanitizeBlogHtml(html: string): string {
  ensureHook();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "allow",
      "allowfullscreen",
      "frameborder",
      "scrolling",
      "target",
      "colspan",
      "rowspan",
      "colwidth",
    ],
  });
}
