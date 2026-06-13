"use client";

import { CalendarDays } from "lucide-react";
import {
  DraggableCardBody,
  DraggableCardContainer,
} from "@/components/ui/draggable-card";
import type { BatchGalleryItem } from "@/lib/batch-gallery";
import { cn } from "@/lib/utils";

const CARD_POSITIONS = [
  "md:left-[4%] md:top-10 md:rotate-[-7deg]",
  "md:left-[20%] md:top-40 md:rotate-[5deg]",
  "md:left-[38%] md:top-8 md:rotate-[-2deg]",
  "md:left-[56%] md:top-36 md:rotate-[8deg]",
  "md:left-[72%] md:top-14 md:rotate-[-5deg]",
  "md:left-[12%] md:top-[25rem] md:rotate-[3deg]",
  "md:left-[34%] md:top-[27rem] md:rotate-[-6deg]",
  "md:left-[58%] md:top-[25rem] md:rotate-[4deg]",
];
const SINGLE_CARD_POSITION =
  "md:left-1/2 md:top-12 md:-translate-x-1/2 md:rotate-[-4deg]";

function formatGalleryDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stageHeightClass(count: number) {
  if (count === 1) return "md:min-h-[28rem]";
  if (count <= 3) return "md:min-h-[32rem]";
  if (count <= 6) return "md:min-h-[44rem]";
  return "md:min-h-[52rem]";
}

function cardPositionClass(index: number, count: number) {
  if (count === 1) return SINGLE_CARD_POSITION;
  return CARD_POSITIONS[index % CARD_POSITIONS.length];
}

/**
 * Public cohort gallery: Aceternity-style draggable cards backed by the
 * admin-uploaded title, caption, and date metadata for each image.
 */
export function CohortGallery({
  items,
  cohortName,
}: {
  items: BatchGalleryItem[];
  cohortName: string;
}) {
  return (
    <DraggableCardContainer
      className={cn(
        "relative grid w-full grid-cols-1 gap-4 py-2 sm:grid-cols-2 md:mx-auto md:block",
        stageHeightClass(items.length),
      )}
    >
      {items.map((item, index) => {
        const title = item.title || `${cohortName} photo ${index + 1}`;
        return (
          <DraggableCardBody
            key={`${item.url}-${index}`}
            className={cn(
              "min-h-0 w-full md:absolute md:w-72 lg:w-80 xl:w-[22rem]",
              cardPositionClass(index, items.length),
            )}
            style={{ zIndex: 10 + index }}
          >
            <figure className="relative z-10">
              <span className="block overflow-hidden rounded-md bg-surface-low">
                {/* biome-ignore lint/performance/noImgElement: admin-curated media on arbitrary domains */}
                <img
                  src={item.url}
                  alt={title}
                  loading="lazy"
                  className="pointer-events-none aspect-[4/3] w-full object-cover"
                />
              </span>
              <figcaption className="mt-3 px-1 pb-1">
                <span className="flex min-w-0 items-start justify-between gap-2">
                  <span className="line-clamp-2 text-base font-semibold leading-snug text-on-surface">
                    {title}
                  </span>
                  {item.date && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">
                      <CalendarDays className="size-3" aria-hidden />
                      {formatGalleryDate(item.date)}
                    </span>
                  )}
                </span>
                {item.caption && (
                  <span className="mt-2 line-clamp-3 block text-sm leading-6 text-on-surface-variant">
                    {item.caption}
                  </span>
                )}
              </figcaption>
            </figure>
          </DraggableCardBody>
        );
      })}
    </DraggableCardContainer>
  );
}
