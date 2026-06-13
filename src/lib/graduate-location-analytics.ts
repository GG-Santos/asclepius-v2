import "server-only";
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

const PLACE_COORDS: Record<string, { lat: number; lng: number }> = {
  philippines: { lat: 12.8797, lng: 121.774 },
  "metro manila": { lat: 14.6091, lng: 121.0223 },
  manila: { lat: 14.5995, lng: 120.9842 },
  "quezon city": { lat: 14.676, lng: 121.0437 },
  caloocan: { lat: 14.7566, lng: 121.045 },
  pasig: { lat: 14.5764, lng: 121.0851 },
  makati: { lat: 14.5547, lng: 121.0244 },
  taguig: { lat: 14.5176, lng: 121.0509 },
  pasay: { lat: 14.5378, lng: 121.0014 },
  mandaluyong: { lat: 14.5794, lng: 121.0359 },
  "san juan": { lat: 14.6042, lng: 121.0299 },
  marikina: { lat: 14.6507, lng: 121.1029 },
  paranaque: { lat: 14.4793, lng: 121.0198 },
  parañaque: { lat: 14.4793, lng: 121.0198 },
  "las pinas": { lat: 14.4445, lng: 120.9939 },
  "las piñas": { lat: 14.4445, lng: 120.9939 },
  muntinlupa: { lat: 14.4081, lng: 121.0415 },
  valenzuela: { lat: 14.7011, lng: 120.983 },
  navotas: { lat: 14.6667, lng: 120.9417 },
  malabon: { lat: 14.6681, lng: 120.9658 },
  pateros: { lat: 14.5448, lng: 121.0671 },
  bulacan: { lat: 14.7942, lng: 120.8799 },
  cavite: { lat: 14.2456, lng: 120.8786 },
  laguna: { lat: 14.1709, lng: 121.2437 },
  rizal: { lat: 14.6037, lng: 121.3084 },
  batangas: { lat: 13.7565, lng: 121.0583 },
  pampanga: { lat: 15.0794, lng: 120.62 },
  tarlac: { lat: 15.4755, lng: 120.5963 },
  zambales: { lat: 15.3372, lng: 120.1635 },
  cebu: { lat: 10.3157, lng: 123.8854 },
  davao: { lat: 7.1907, lng: 125.4553 },
  iloilo: { lat: 10.7202, lng: 122.5621 },
  baguio: { lat: 16.4023, lng: 120.596 },
};

const DAY_MS = 86_400_000;

function key(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coordsFor(
  city?: string | null,
  province?: string | null,
  country?: string | null,
) {
  return (
    PLACE_COORDS[key(city)] ??
    PLACE_COORDS[key(province)] ??
    PLACE_COORDS[key(country)]
  );
}

function labelFor(
  city?: string | null,
  province?: string | null,
  country?: string | null,
) {
  return [city, province, country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
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
  const graduates = await prisma.graduate.findMany({
    where: {
      OR: [
        { city: { not: null } },
        { province: { not: null } },
        { country: { not: null } },
      ],
    },
    orderBy: [{ status: "asc" }, { expiresAt: "asc" }, { createdAt: "desc" }],
    take: 160,
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
      city: true,
      province: true,
      country: true,
      photo: { select: { url: true } },
    },
  });

  const located = graduates
    .map((graduate) => {
      const coords = coordsFor(
        graduate.city,
        graduate.province,
        graduate.country,
      );
      if (!coords) return null;
      const locationLabel =
        labelFor(graduate.city, graduate.province, graduate.country) ||
        "Unknown location";
      const status = statusFor(graduate.status, graduate.expiresAt, now);
      return {
        graduate,
        coords,
        locationLabel,
        status,
        coordKey: `${coords.lat}:${coords.lng}:${locationLabel}`,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.status.rank - b.status.rank);

  const totals = new Map<string, number>();
  for (const item of located)
    totals.set(item.coordKey, (totals.get(item.coordKey) ?? 0) + 1);

  const seen = new Map<string, number>();
  return located.slice(0, 96).map((item) => {
    const index = seen.get(item.coordKey) ?? 0;
    seen.set(item.coordKey, index + 1);
    const coords = spreadCoords(
      item.coords,
      index,
      totals.get(item.coordKey) ?? 1,
    );
    return {
      id: item.graduate.id,
      label: nameFor(item.graduate),
      locationLabel: item.locationLabel,
      photoUrl: item.graduate.photo?.url ?? "/icon.png",
      tone: item.status.tone,
      statusLabel: item.status.statusLabel,
      lat: coords.lat,
      lng: coords.lng,
    };
  });
}
