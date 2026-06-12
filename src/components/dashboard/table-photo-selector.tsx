"use client";

import { Check, Minus } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function TableSelectPageButton({
  checked,
  mixed,
  onToggle,
  label = "Select visible rows",
}: {
  checked: boolean;
  mixed: boolean;
  onToggle: () => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <label className="inline-flex cursor-pointer">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded border transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background",
          checked || mixed
            ? "border-accent bg-accent text-on-accent"
            : "border-outline-variant bg-card text-on-surface-variant hover:border-accent hover:text-accent",
        )}
      >
        {mixed ? (
          <Minus className="size-4" aria-hidden />
        ) : (
          <Check
            className={cn("size-4", checked ? "opacity-100" : "opacity-0")}
            aria-hidden
          />
        )}
      </span>
    </label>
  );
}

export function TablePhotoSelect({
  src,
  label,
  selected,
  onToggle,
}: {
  src: string | null;
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "group relative block h-11 w-9 cursor-pointer rounded focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        aria-label={`${selected ? "Deselect" : "Select"} ${label}`}
        onChange={() => {
          onToggle();
        }}
        className="sr-only"
      />
      {src ? (
        <Image
          src={src}
          alt=""
          width={36}
          height={44}
          className="h-11 w-9 rounded object-cover"
        />
      ) : (
        <span className="flex h-11 w-9 items-center justify-center rounded bg-surface-highest text-[10px] text-on-surface-variant">
          -
        </span>
      )}
      <span
        className={cn(
          "-right-1 -top-1 absolute flex size-5 items-center justify-center rounded-full border border-card bg-accent text-on-accent shadow-[var(--shadow-clinical)] transition-all",
          selected
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-80",
        )}
        aria-hidden
      >
        <Check className="size-3" />
      </span>
    </label>
  );
}
