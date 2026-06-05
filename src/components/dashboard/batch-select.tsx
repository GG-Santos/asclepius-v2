"use client";

import { useEffect, useState } from "react";

type BatchOption = {
  id: string;
  code: string;
  batchNumber: string | null;
  label: string | null;
};

function displayName(b: BatchOption): string {
  const parts: string[] = [];
  if (b.batchNumber) parts.push(`Batch ${b.batchNumber}`);
  parts.push(b.code);
  if (b.label) parts.push(`— ${b.label}`);
  return parts.join(" ");
}

export function BatchSelect({
  defaultValue,
  name = "batchCode",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const [options, setOptions] = useState<BatchOption[]>([]);
  const [value, setValue] = useState(defaultValue ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => r.json())
      .then((data: BatchOption[]) => {
        setOptions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <select
      name={name}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      disabled={loading}
      className="h-11 w-full rounded border border-outline-variant bg-card px-3 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
    >
      <option value="">{loading ? "Loading batches…" : "— No batch —"}</option>
      {options.map((b) => (
        <option key={b.id} value={b.code}>
          {displayName(b)}
        </option>
      ))}
    </select>
  );
}
