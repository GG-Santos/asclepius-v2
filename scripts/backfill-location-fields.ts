import {
  findLocationCoordinates,
  getRegionOptions,
  locationKey,
  postalCodeFor,
} from "../src/lib/location-options";
import { prisma } from "../src/lib/prisma";

type LocationRow = {
  id: string;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  town: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

type BackfillStats = {
  scanned: number;
  updated: number;
  withCoordinates: number;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function nullable(value: string) {
  return value || null;
}

function hasAddress(row: LocationRow) {
  return Boolean(
    clean(row.streetAddress) ||
      clean(row.city) ||
      clean(row.province) ||
      clean(row.town) ||
      clean(row.country),
  );
}

function isPhilippines(country?: string | null) {
  const key = locationKey(country);
  return !key || key === "philippines" || key === "ph";
}

function normalizeNcrCity(value?: string | null) {
  const key = locationKey(value);
  if (!key) return "";
  if (key === "quezon") return "Quezon City";
  if (key === "paranaque") return "Parañaque";
  if (key === "las pinas") return "Las Piñas";
  return clean(value).replace(/\s+/g, " ");
}

function canonicalRegion(country: string | null, province: string | null) {
  const value = clean(province);
  if (!value) return "";
  if (isPhilippines(country)) {
    if (
      locationKey(value) === "metro manila" ||
      locationKey(value) === "national capital region" ||
      locationKey(value) === "ncr"
    ) {
      return "National Capital Region";
    }
    const match = getRegionOptions("Philippines").find(
      (option) =>
        locationKey(option.value) === locationKey(value) ||
        locationKey(option.label) === locationKey(value) ||
        locationKey(option.code) === locationKey(value),
    );
    return match?.value ?? value;
  }
  return value;
}

function normalize(row: LocationRow) {
  if (!hasAddress(row)) return null;

  const country =
    clean(row.country) || (isPhilippines(row.country) ? "Philippines" : "");
  let province = canonicalRegion(country, row.province);
  let city = normalizeNcrCity(row.city);
  let town = clean(row.town);

  if (isPhilippines(country)) {
    const cityKey = locationKey(city);
    const townAsCity = normalizeNcrCity(town);
    if (locationKey(row.province) === "metro manila" && !province) {
      province = "National Capital Region";
    }
    if (cityKey === "metro manila") {
      city = townAsCity;
      town = "";
    }
    if (locationKey(city) === locationKey(town)) {
      town = "";
    }
  }

  const selection = {
    country: nullable(country),
    province: nullable(province),
    city: nullable(city),
    town: nullable(town),
  };
  const coords = findLocationCoordinates(selection);
  const postalCode =
    clean(row.postalCode) || postalCodeFor(selection) || clean(row.postalCode);

  return {
    country: selection.country,
    province: selection.province,
    city: selection.city,
    town: selection.town,
    postalCode: nullable(postalCode),
    latitude: coords?.latitude ?? row.latitude,
    longitude: coords?.longitude ?? row.longitude,
  };
}

function changed(
  row: LocationRow,
  next: NonNullable<ReturnType<typeof normalize>>,
) {
  return (
    row.country !== next.country ||
    row.province !== next.province ||
    row.city !== next.city ||
    row.town !== next.town ||
    row.postalCode !== next.postalCode ||
    row.latitude !== next.latitude ||
    row.longitude !== next.longitude
  );
}

async function backfillStudents(): Promise<BackfillStats> {
  const rows = await prisma.student.findMany({
    where: {
      OR: [
        { streetAddress: { not: null } },
        { city: { not: null } },
        { province: { not: null } },
        { town: { not: null } },
        { country: { not: null } },
      ],
    },
    select: {
      id: true,
      streetAddress: true,
      city: true,
      province: true,
      town: true,
      country: true,
      postalCode: true,
      latitude: true,
      longitude: true,
    },
  });
  const stats = { scanned: rows.length, updated: 0, withCoordinates: 0 };
  for (const row of rows) {
    const next = normalize(row);
    if (!next) continue;
    if (next.latitude != null && next.longitude != null)
      stats.withCoordinates += 1;
    if (!changed(row, next)) continue;
    await prisma.student.update({ where: { id: row.id }, data: next });
    stats.updated += 1;
  }
  return stats;
}

async function backfillGraduates(): Promise<BackfillStats> {
  const rows = await prisma.graduate.findMany({
    where: {
      OR: [
        { streetAddress: { not: null } },
        { city: { not: null } },
        { province: { not: null } },
        { town: { not: null } },
        { country: { not: null } },
      ],
    },
    select: {
      id: true,
      streetAddress: true,
      city: true,
      province: true,
      town: true,
      country: true,
      postalCode: true,
      latitude: true,
      longitude: true,
    },
  });
  const stats = { scanned: rows.length, updated: 0, withCoordinates: 0 };
  for (const row of rows) {
    const next = normalize(row);
    if (!next) continue;
    if (next.latitude != null && next.longitude != null)
      stats.withCoordinates += 1;
    if (!changed(row, next)) continue;
    await prisma.graduate.update({ where: { id: row.id }, data: next });
    stats.updated += 1;
  }
  return stats;
}

async function main() {
  const [students, graduates] = await Promise.all([
    backfillStudents(),
    backfillGraduates(),
  ]);
  console.log(
    JSON.stringify(
      {
        students,
        graduates,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
