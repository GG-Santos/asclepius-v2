"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseLooseDate } from "@/lib/graduate";
import { cn } from "@/lib/utils";

/** Stored/display format — matches existing registry raw strings and is
 *  parseable by parseLooseDate on the server. */
const DISPLAY = "MMM dd, yyyy";
const ISO = "yyyy-MM-dd";

function outputForDate(parsed: Date, outputFormat: "display" | "iso"): string {
  return format(parsed, outputFormat === "iso" ? ISO : DISPLAY);
}

function textForDate(raw?: string): string {
  const parsed = parseLooseDate(raw ?? null);
  return parsed ? format(parsed, DISPLAY) : (raw ?? "");
}

/* ── natural-language parsing (ported from the reference date picker) ───── */

function levenshtein(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

/** Typo-tolerant keyword match ("todai" → "today"). */
function fuzzy(input: string, keyword: string, threshold = 2): boolean {
  const d = levenshtein(input, keyword);
  return d <= threshold && d < keyword.length / 2;
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function parseNaturalDate(raw: string): Date | null {
  const input = raw.toLowerCase().trim();
  if (!input) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = (fn: (d: Date) => void) => {
    const d = new Date(today);
    fn(d);
    return d;
  };

  // Simple relative words, typo-tolerant.
  if (input === "now" || input === "tdy" || fuzzy(input, "today"))
    return new Date(today);
  if (input === "tmrw" || input === "tmr" || fuzzy(input, "tomorrow"))
    return from((d) => d.setDate(d.getDate() + 1));
  if (input === "yday" || fuzzy(input, "yesterday"))
    return from((d) => d.setDate(d.getDate() - 1));
  if (fuzzy(input, "day after tomorrow", 3))
    return from((d) => d.setDate(d.getDate() + 2));

  // "in 3 days" / "in 2 weeks" / "in 6 months" / "in 1 year"
  let m = input.match(/^in\s+(\d+)\s+(days?|weeks?|months?|years?)$/);
  // "3 days from now" / "2 weeks" (bare period counts as future)
  m =
    m ??
    input.match(/^(\d+)\s+(days?|weeks?|months?|years?)(?:\s+from\s+now)?$/);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    const unit = m[2];
    return from((d) => {
      if (unit.startsWith("day")) d.setDate(d.getDate() + n);
      else if (unit.startsWith("week")) d.setDate(d.getDate() + n * 7);
      else if (unit.startsWith("month")) d.setMonth(d.getMonth() + n);
      else d.setFullYear(d.getFullYear() + n);
    });
  }

  // "3 days ago" / "2 months ago"
  m = input.match(/^(\d+)\s+(days?|weeks?|months?|years?)\s+ago$/);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    const unit = m[2];
    return from((d) => {
      if (unit.startsWith("day")) d.setDate(d.getDate() - n);
      else if (unit.startsWith("week")) d.setDate(d.getDate() - n * 7);
      else if (unit.startsWith("month")) d.setMonth(d.getMonth() - n);
      else d.setFullYear(d.getFullYear() - n);
    });
  }

  // "next week|month|year|monday…" / "last …" / "this …"
  m = input.match(/^(next|last|this)\s+(week|month|year|[a-z]+day)$/);
  if (m) {
    const dir = m[1];
    const unit = m[2];
    const sign = dir === "last" ? -1 : 1;
    if (unit === "week")
      return from((d) =>
        d.setDate(d.getDate() + (dir === "this" ? -d.getDay() : sign * 7)),
      );
    if (unit === "month")
      return from((d) =>
        dir === "this" ? d.setDate(1) : d.setMonth(d.getMonth() + sign),
      );
    if (unit === "year")
      return from((d) =>
        dir === "this"
          ? d.setMonth(0, 1)
          : d.setFullYear(d.getFullYear() + sign),
      );
    const target = WEEKDAYS.indexOf(unit);
    if (target !== -1) {
      return from((d) => {
        let delta = target - d.getDay();
        if (dir === "next" && delta <= 0) delta += 7;
        if (dir === "last") delta = delta >= 0 ? delta - 7 : delta;
        d.setDate(d.getDate() + delta);
      });
    }
  }

  // MM/DD/YYYY
  m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // YYYY-MM-DD (kept local — `new Date("yyyy-mm-dd")` would parse as UTC)
  m = raw.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "December 25, 2025", "Aug 03,2024", "Sept 1 2024" … — the registry's
  // loose format parser handles the rest.
  return parseLooseDate(raw);
}

/* ── component ───────────────────────────────────────────────────────────── */

/**
 * Date field with natural-language input + calendar popover (pattern studied
 * from the reference implementation). Type "today", "in 2 weeks", "next
 * monday", "12/25/2025" … and it commits on Enter/blur; or pick from the
 * calendar. Form-ready: submits its value through a hidden input as a
 * "MMM dd, yyyy" string (what the registry stores and parses).
 */
export function DatePicker({
  name,
  value: controlledValue,
  defaultValue,
  placeholder = "e.g. Aug 03, 2026 · today · in 1 year",
  className,
  disabled,
  outputFormat = "display",
  onValueChange,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  outputFormat?: "display" | "iso";
  onValueChange?: (value: string) => void;
}) {
  const initialValue = controlledValue ?? defaultValue ?? "";
  const initial = parseLooseDate(initialValue);
  const [text, setText] = useState(() => textForDate(initialValue));
  const [value, setValue] = useState(() =>
    initial ? outputForDate(initial, outputFormat) : initialValue,
  );
  const [date, setDate] = useState<Date | undefined>(initial ?? undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (controlledValue === undefined) return;
    const parsed = parseLooseDate(controlledValue);
    setDate(parsed ?? undefined);
    setText(parsed ? format(parsed, DISPLAY) : controlledValue);
    setValue(parsed ? outputForDate(parsed, outputFormat) : controlledValue);
  }, [controlledValue, outputFormat]);

  function commit(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      setValue("");
      setDate(undefined);
      onValueChange?.("");
      return;
    }
    const parsed = parseNaturalDate(trimmed);
    if (!parsed) return; // leave the text as typed; submit keeps last good value
    const display = format(parsed, DISPLAY);
    const next = outputForDate(parsed, outputFormat);
    setDate(parsed);
    setText(display);
    setValue(next);
    onValueChange?.(next);
  }

  function pick(picked: Date | undefined) {
    if (!picked) return;
    const display = format(picked, DISPLAY);
    const next = outputForDate(picked, outputFormat);
    setDate(picked);
    setText(display);
    setValue(next);
    onValueChange?.(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative w-full", className)}>
          {/* What the form actually submits. */}
          {name && <input type="hidden" name={name} value={value} />}
          <Input
            type="text"
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (!open) commit(text);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(text);
              }
            }}
            className="pr-10"
          />
          <PopoverTrigger
            type="button"
            disabled={disabled}
            aria-label="Open calendar"
            className="absolute top-0 right-0 flex h-full items-center px-3 text-on-surface-variant transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
            onClick={() => commit(text)}
          >
            <CalendarDays className="size-4" aria-hidden />
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={pick}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
