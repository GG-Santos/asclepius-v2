"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

/** Copies the current verification URL — the shareable proof. */
export function ShareLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — the URL bar still works; stay silent.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-card px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.1]"
    >
      {copied ? (
        <Check className="size-3.5 text-success" aria-hidden />
      ) : (
        <Link2 className="size-3.5" aria-hidden />
      )}
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
