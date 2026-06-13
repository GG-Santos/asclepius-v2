import "server-only";
import { findLocationCoordinates, locationLabel } from "@/lib/location-options";
import { prisma } from "@/lib/prisma";

export type GraduateLocationTone =
  | "active"
  | "expiring"
  | "expired"
  | "archived";

export type GraduateLocationPoint = {
  id: string;
  label: string;
  locationLabel: string;
  photoUrl: string;
  tone: GraduateLocationTone;
  statusLabel: string;
  lat: number;
  lng: number;
};

const DAY_MS = 86_400_000;

function labelFor(
  town?: string | null,
  city?: string | null,
  province?: string | null,
  country?: string | null,
) {
  return locationLabel({ town, city, province, country });
}

function nameFor(graduate: {
  name: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
  lcn: string;
}) {
  const structured = [
    graduate.firstName,
    graduate.middleName,
    graduate.lastName,
    graduate.suffix,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return structured || graduate.name?.trim() || graduate.lcn;
}

function statusFor(
  status: "STUDENT" | "GRADUATE" | "ARCHIVED",
  expiresAt: Date | null,
  now: Date,
): { tone: GraduateLocationTone; statusLabel: string; rank: number } {
  if (status === "ARCHIVED") {
    return { tone: "archived", statusLabel: "Archived", rank: 3 };
  }
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return { tone: "expired", statusLabel: "Expired", rank: 2 };
  }
  if (expiresAt) {
    const days = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);
    if (days <= 90) {
      const windowDays = days <= 1 ? 1 : days <= 7 ? 7 : days <= 30 ? 30 : 90;
      return {
        tone: "expiring",
        statusLabel: `Expiring within ${windowDays} day${windowDays === 1 ? "" : "s"}`,
        rank: 1,
      };
    }
  }
  return { tone: "active", statusLabel: "Active", rank: 0 };
}

function coordsFor(record: {
  latitude: number | null;
  longitude: number | null;
  town: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
}) {
  if (
    record.latitude != null &&
    record.longitude != null &&
    Number.isFinite(record.latitude) &&
    Number.isFinite(record.longitude)
  ) {
    return { lat: record.latitude, lng: record.longitude };
  }
  const derived = findLocationCoordinates(record);
  return derived ? { lat: derived.latitude, lng: derived.longitude } : null;
}

function spreadCoords(
  coords: { lat: number; lng: number },
  index: number,
  total: number,
) {
  if (total <= 1) return coords;
  const ring = Math.floor(index / 8) + 1;
  const angle = (index * 137.508 * Math.PI) / 180;
  const radius = Math.min(0.85, 0.12 * ring);
  return {
    lat: coords.lat + Math.sin(angle) * radius,
    lng: coords.lng + Math.cos(angle) * radius,
  };
}

export async function getGraduateLocationPoints(): Promise<
  GraduateLocationPoint[]
> {
  const now = new Date();
  const locationWhere = {
    OR: [
      { latitude: { not: null } },
      { longitude: { not: null } },
      { town: { not: null } },
      { city: { not: null } },
      { province: { not: null } },
      { country: { not: null } },
    ],
  };
  const graduates = await prisma.graduate.findMany({
    where: locationWhere,
    orderBy: [{ status: "asc" }, { expiresAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      lcn: true,
      name: true,
      firstName: true,
      middleName: true,
      lastName: true,
      suffix: true,
      status: true,
      expiresAt: true,
      town: true,
      city: true,
      province: true,
      country: true,
      latitude: true,
      longitude: true,
      photo: { select: { url: true } },
    },
  });

  const graduateLocations = graduates
    .map((graduate) => {
      const coords = coordsFor(graduate);
      if (!coords) return null;
      const locationLabel =
        labelFor(
          graduate.town,
          graduate.city,
          graduate.province,
          graduate.country,
        ) || "Unknown location";
      const status = statusFor(graduate.status, graduate.expiresAt, now);
      return {
        id: graduate.id,
        label: nameFor(graduate),
        photoUrl: graduate.photo?.url ?? "/icon.png",
        coords,
        locationLabel,
        status,
        coordKey: `${coords.lat}:${coords.lng}:${locationLabel}`,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.status.rank - b.status.rank);

  const located = graduateLocations.sort(
    (a, b) => a.status.rank - b.status.rank,
  );

  const totals = new Map<string, number>();
  for (const item of located)
    totals.set(item.coordKey, (totals.get(item.coordKey) ?? 0) + 1);

  const seen = new Map<string, number>();
  return located.map((item) => {
    const index = seen.get(item.coordKey) ?? 0;
    seen.set(item.coordKey, index + 1);
    const coords = spreadCoords(
      item.coords,
      index,
      totals.get(item.coordKey) ?? 1,
    );
    return {
      id: item.id,
      label: item.label,
      locationLabel: item.locationLabel,
      photoUrl: item.photoUrl,
      tone: item.status.tone,
      statusLabel: item.status.statusLabel,
      lat: coords.lat,
      lng: coords.lng,
    };
  });
}
