"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Creatable tag combobox with chips: type to filter existing tags, Enter/comma
 * to add, click a suggestion to pick, or create a brand-new tag. Selected tags
 * submit as repeated hidden inputs (read server-side with formData.getAll).
 */
export function TagInput({
  name = "tags",
  defaultValue = [],
  suggestions = [],
}: {
  name?: string;
  defaultValue?: string[];
  suggestions?: string[];
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  function add(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (!tags.some((x) => norm(x) === norm(t))) setTags([...tags, t]);
    setInput("");
  }
  function remove(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  const filtered = useMemo(() => {
    const q = norm(input);
    return suggestions
      .filter((s) => !tags.some((t) => norm(t) === norm(s)))
      .filter((s) => (q ? norm(s).includes(q) : true))
      .slice(0, 8);
  }, [input, suggestions, tags]);

  const canCreate =
    input.trim().length > 0 &&
    !suggestions.some((s) => norm(s) === norm(input)) &&
    !tags.some((t) => norm(t) === norm(input));

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-outline-variant bg-card px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="hover:text-secondary"
              aria-label={`Remove ${t}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && !input && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length ? "" : "Add tags…"}
          className="min-w-[8ch] flex-1 bg-transparent text-sm text-on-surface outline-none"
        />
      </div>

      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border border-outline-variant/60 bg-card py-1 shadow-[var(--shadow-clinical-md)]">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => add(s)}
              className="block w-full px-3 py-1.5 text-left text-sm text-on-surface hover:bg-surface-container"
            >
              {s}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={() => add(input)}
              className="block w-full px-3 py-1.5 text-left text-xs text-on-surface-variant hover:bg-surface-container"
            >
              Create “{input.trim()}”
            </button>
          )}
        </div>
      )}

      {tags.map((t) => (
        <input key={t} type="hidden" name={name} value={t} readOnly />
      ))}
    </div>
  );
}
