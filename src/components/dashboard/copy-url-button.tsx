"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy URL"
      className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent"
    >
      {copied ? (
        <Check className="size-4 text-success" />
      ) : (
        <Link2 className="size-4" />
      )}
    </button>
  );
}
