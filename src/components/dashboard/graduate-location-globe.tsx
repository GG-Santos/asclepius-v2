"use client";

import { useMemo, useState } from "react";
import { Globe3D, type GlobeMarker } from "@/components/ui/3d-globe";
import type {
  GraduateLocationPoint,
  GraduateLocationTone,
} from "@/lib/graduate-location-analytics";

const OUTLINE: Record<GraduateLocationTone, string> = {
  active: "#22c55e",
  expiring: "#facc15",
  expired: "#ef4444",
  archived: "#9ca3af",
};

type MarkerWithStatus = GlobeMarker & {
  statusLabel?: string;
  locationLabel?: string;
};

export function GraduateLocationGlobe({
  points,
}: {
  points: GraduateLocationPoint[];
}) {
  const [hovered, setHovered] = useState<MarkerWithStatus | null>(null);
  const markers = useMemo<MarkerWithStatus[]>(
    () =>
      points.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        src: point.photoUrl,
        label: point.label,
        locationLabel: point.locationLabel,
        statusLabel: point.statusLabel,
        outlineColor: OUTLINE[point.tone],
        size: 0.07,
      })),
    [points],
  );

  return (
    <div className="relative min-h-[24rem] overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-low">
      {markers.length > 0 ? (
        <Globe3D
          markers={markers}
          className="absolute -bottom-[20rem] -left-24 h-[42rem] w-[42rem] max-w-none md:-bottom-[22rem] md:-left-28 md:h-[46rem] md:w-[46rem]"
          config={{
            autoRotateSpeed: 0.02,
            bumpScale: 0.8,
            initialRotation: { x: 0.24, y: 2.6 },
            markerSize: 0.07,
            showAtmosphere: false,
            showWireframe: false,
            ambientIntensity: 0.82,
            pointLightIntensity: 1.35,
          }}
          onMarkerHover={(marker) =>
            setHovered((marker as MarkerWithStatus | null) ?? null)
          }
        />
      ) : (
        <div className="flex min-h-[24rem] items-center justify-center px-4 text-center text-sm text-on-surface-variant">
          No graduate location data yet.
        </div>
      )}

      {hovered?.label && (
        <div className="absolute bottom-3 left-3 right-3 rounded-md border border-outline-variant/70 bg-card/95 px-3 py-2 text-sm text-on-surface shadow-clinical">
          <p className="font-semibold">{hovered.label}</p>
          <p className="text-xs text-on-surface-variant">
            {hovered.statusLabel}
            {hovered.locationLabel ? ` · ${hovered.locationLabel}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
