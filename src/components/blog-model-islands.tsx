"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModelViewerFrame } from "@/components/model-viewer-frame";

// Module-level map survives the strict-mode double-invocation cycle.
// Keys are the placeholder DOM nodes; entries are reused on re-render.
const islandRoots = new WeakMap<Element, Root>();

/**
 * Hydrates 3D-model placeholders inside a sanitized blog post. The post HTML is
 * injected via dangerouslySetInnerHTML, so each `<div data-model3d="slug">`
 * isn't React-managed — we mount an independent React root (island) into it.
 */
export function BlogModelIslands({
  models,
}: {
  models: Record<string, string>;
}) {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-model3d]"),
    );
    for (const node of nodes) {
      const slug = node.getAttribute("data-model3d") ?? "";
      const url = models[slug];
      if (!url) continue;

      // Reuse an existing root rather than calling createRoot() twice on the
      // same node (strict-mode double-fire would otherwise throw).
      let root = islandRoots.get(node);
      if (!root) {
        node.textContent = "";
        root = createRoot(node);
        islandRoots.set(node, root);
      }
      root.render(
        <ModelViewerFrame url={url} className="aspect-video w-full" />,
      );
    }

    return () => {
      // Only unmount when the node has actually left the document (navigation).
      // During strict-mode double-fire the nodes are still present — skip so
      // the re-mount can reuse the existing roots above.
      setTimeout(() => {
        for (const node of nodes) {
          if (!document.contains(node)) {
            const root = islandRoots.get(node);
            if (root) {
              islandRoots.delete(node);
              root.unmount();
            }
          }
        }
      }, 0);
    };
  }, [models]);

  return null;
}
