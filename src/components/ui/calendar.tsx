"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

/**
 * Month calendar on the Vital Signs tokens (react-day-picker v9). Dropdown
 * month/year captions so registry dates decades out are one click away.
 */
export function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      captionLayout="dropdown"
      startMonth={new Date(1990, 0)}
      endMonth={new Date(2045, 11)}
      className={cn("select-none", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "space-y-3",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "hidden",
        dropdowns: "flex items-center gap-1.5 text-sm font-medium",
        dropdown:
          "rounded border border-outline-variant bg-card px-1.5 py-1 text-sm text-on-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
        nav: "absolute top-0 right-0 left-0 flex h-9 items-center justify-between",
        button_previous:
          "flex size-8 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        button_next:
          "flex size-8 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant/70",
        week: "mt-1 flex",
        day: "p-0",
        day_button:
          "flex size-9 items-center justify-center rounded text-sm text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected:
          "[&>button]:bg-accent [&>button]:font-semibold [&>button]:text-on-accent [&>button:hover]:bg-accent",
        today: "[&>button]:font-bold [&>button]:text-accent",
        outside: "[&>button]:text-on-surface-variant/40",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
        hidden: "invisible",
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
