"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Split-digit grade entry (XX.XX) matching the reference's OTP-style boxes.
// Writes the combined numeric string to a hidden input named `name` so it
// submits with the form (e.g. scoreFWE).
function toDigits(value?: string): [string, string, string, string] {
  const n = value ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(n)) return ["", "", "", ""];
  const fixed = Math.min(99.99, Math.max(0, n)).toFixed(2); // "08.50"
  const [whole, frac] = fixed.split(".");
  const w = whole.padStart(2, "0");
  return [w[0], w[1], frac[0], frac[1]];
}

function combine(d: [string, string, string, string]): string {
  const whole = `${d[0] || "0"}${d[1] || "0"}`;
  const frac = `${d[2] || "0"}${d[3] || "0"}`;
  const num = Number.parseFloat(`${whole}.${frac}`);
  if (!Number.isFinite(num) || num === 0) return "";
  // Trim trailing zeros for storage (8.50 -> 8.5, 8.00 -> 8)
  return String(num);
}

export function GradeCells({
  name,
  defaultValue,
  onValue,
}: {
  name: string;
  defaultValue?: string;
  onValue?: (value: string) => void;
}) {
  const baseId = useId();
  const [digits, setDigits] = useState<[string, string, string, string]>(
    toDigits(defaultValue),
  );
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  function setAt(i: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits] as [string, string, string, string];
    next[i] = ch;
    setDigits(next);
    onValue?.(combine(next));
    if (ch && i < 3) refs[i + 1].current?.focus();
  }

  const cell = (i: number) => (
    <input
      ref={refs[i]}
      id={`${baseId}-${i}`}
      inputMode="numeric"
      maxLength={1}
      value={digits[i]}
      onChange={(e) => setAt(i, e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && !digits[i] && i > 0)
          refs[i - 1].current?.focus();
      }}
      className={cn(
        "size-9 rounded-md border border-outline-variant bg-card text-center text-sm font-medium text-on-surface",
        "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
      )}
      placeholder="0"
    />
  );

  return (
    <div className="flex items-center gap-1">
      {cell(0)}
      {cell(1)}
      <span className="px-0.5 font-semibold text-on-surface-variant">.</span>
      {cell(2)}
      {cell(3)}
      <input type="hidden" name={name} value={combine(digits)} readOnly />
    </div>
  );
}
