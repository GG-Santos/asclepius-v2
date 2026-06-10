"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Public cohort gallery: responsive thumbnail grid; clicking opens the image
 * in a chrome-less lightbox (click outside / Escape closes).
 */
export function CohortGallery({
  images,
  cohortName,
}: {
  images: string[];
  cohortName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group block w-full overflow-hidden rounded-lg border border-outline-variant/60 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-clinical-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-white/[0.08]"
            >
              {/* biome-ignore lint/performance/noImgElement: admin-curated media on arbitrary domains */}
              <img
                src={url}
                alt={`${cohortName} gallery photo ${i + 1}`}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

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
          {openIndex !== null && images[openIndex] && (
            // biome-ignore lint/performance/noImgElement: admin-curated media on arbitrary domains
            <img
              src={images[openIndex]}
              alt={`${cohortName} gallery photo ${openIndex + 1}`}
              className="max-h-[85svh] w-full rounded-xl object-contain shadow-[var(--shadow-clinical-md)]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
