"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { BatchGalleryItem } from "@/lib/batch-gallery";

type Offset = { x: number; y: number; r: number };

function baseOffset(index: number): Offset {
  const rotations = [-7, 5, -2, 8, -5, 3, -8, 6];
  const column = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: (column - 1.5) * 108,
    y: (row - 0.5) * 142,
    r: rotations[index % rotations.length],
  };
}

function formatGalleryDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Public cohort gallery: Aceternity-inspired draggable image cards with
 * metadata and a lightbox. Cards gently return to their saved spread after
 * idle/blur so visitors can play without losing the gallery structure.
 */
export function CohortGallery({
  items,
  cohortName,
}: {
  items: BatchGalleryItem[];
  cohortName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [offsets, setOffsets] = useState<Record<number, Offset>>({});
  const [dragging, setDragging] = useState<number | null>(null);
  const idleTimer = useRef<number | null>(null);
  const dragRef = useRef<{
    index: number;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    offset: Offset;
  } | null>(null);
  const rows = Math.max(1, Math.ceil(items.length / 4));
  const stageHeight = Math.min(860, 360 + (rows - 1) * 155);
  const baseOffsets = useMemo(
    () => items.map((_, index) => baseOffset(index)),
    [items],
  );

  function resetSoon(delay = 2800) {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setOffsets({}), delay);
  }

  useEffect(() => {
    function onBlur() {
      setOffsets({});
      setDragging(null);
    }
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <>
      <div
        className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container/60 shadow-clinical dark:border-white/[0.08] dark:bg-white/[0.02]"
        style={{ minHeight: stageHeight }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.09),transparent_58%)]" />
        {items.map((item, i) => {
          const base = baseOffsets[i];
          const offset = offsets[i] ?? { x: 0, y: 0, r: 0 };
          const title = item.title || `${cohortName} photo ${i + 1}`;
          return (
            <button
              key={`${item.url}-${i}`}
              type="button"
              aria-label={`Open ${title}`}
              onPointerDown={(event) => {
                if (idleTimer.current) window.clearTimeout(idleTimer.current);
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  index: i,
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  moved: false,
                  offset,
                };
                setDragging(i);
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                const dx = event.clientX - drag.startX;
                const dy = event.clientY - drag.startY;
                const moved = Math.abs(dx) + Math.abs(dy) > 7;
                drag.moved = drag.moved || moved;
                setOffsets((current) => ({
                  ...current,
                  [drag.index]: {
                    x: drag.offset.x + dx,
                    y: drag.offset.y + dy,
                    r: drag.offset.r + dx / 34,
                  },
                }));
              }}
              onPointerUp={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                event.currentTarget.releasePointerCapture(event.pointerId);
                setDragging(null);
                dragRef.current = null;
                if (!drag.moved) setOpenIndex(i);
                resetSoon();
              }}
              onPointerCancel={() => {
                setDragging(null);
                dragRef.current = null;
                resetSoon(900);
              }}
              className="absolute left-1/2 top-1/2 w-[min(68vw,16rem)] cursor-grab touch-none select-none rounded-xl border border-outline-variant bg-card p-2 text-left shadow-clinical-md outline-none transition-[box-shadow,border-color] hover:border-accent hover:shadow-[var(--shadow-clinical-md)] focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing motion-reduce:transition-none dark:border-white/[0.08]"
              style={{
                transform: `translate(-50%, -50%) translate(${base.x + offset.x}px, ${base.y + offset.y}px) rotate(${base.r + offset.r}deg)`,
                transition:
                  dragging === i
                    ? "box-shadow 160ms ease, border-color 160ms ease"
                    : "transform 700ms cubic-bezier(.16,1,.3,1), box-shadow 160ms ease, border-color 160ms ease",
                zIndex: dragging === i ? 40 : 10 + i,
              }}
            >
              <span className="block overflow-hidden rounded-lg bg-surface-low">
                {/* biome-ignore lint/performance/noImgElement: admin-curated media on arbitrary domains */}
                <img
                  src={item.url}
                  alt={title}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </span>
              <span className="mt-2 block min-w-0">
                <span className="block truncate text-sm font-semibold text-on-surface">
                  {title}
                </span>
                {item.date && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent">
                    <CalendarDays className="size-3" aria-hidden />
                    {formatGalleryDate(item.date)}
                  </span>
                )}
                {item.caption && (
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-on-surface-variant">
                    {item.caption}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => {
          if (!open) setOpenIndex(null);
        }}
      >
        <DialogContent bare className="max-w-4xl px-4">
          <DialogTitle className="sr-only">
            {cohortName} gallery photo
          </DialogTitle>
          {openIndex !== null && items[openIndex] && (
            <figure className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-clinical-md)]">
              {/* biome-ignore lint/performance/noImgElement: admin-curated media on arbitrary domains */}
              <img
                src={items[openIndex].url}
                alt={items[openIndex].title || `${cohortName} gallery item`}
                className="max-h-[76svh] w-full object-contain"
              />
              {(items[openIndex].title ||
                items[openIndex].date ||
                items[openIndex].caption) && (
                <figcaption className="border-outline-variant border-t bg-card px-4 py-3">
                  <p className="font-semibold text-on-surface">
                    {items[openIndex].title ?? cohortName}
                  </p>
                  {items[openIndex].date && (
                    <p className="mt-0.5 text-xs text-accent">
                      {formatGalleryDate(items[openIndex].date)}
                    </p>
                  )}
                  {items[openIndex].caption && (
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {items[openIndex].caption}
                    </p>
                  )}
                </figcaption>
              )}
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
