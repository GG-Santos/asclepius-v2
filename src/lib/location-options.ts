import { City, Country, State } from "country-state-city";
import { barangays, municipalities, provinces, regions } from "psgc";
import zipcodes from "zipcodes-ph/build/zipcodes.json";

export type LocationOption = {
  value: string;
  label: string;
  code?: string;
  latitude?: number;
  longitude?: number;
};

export type LocationSelection = {
  country?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  town?: string | null;
};

const PHILIPPINES = "Philippines";
const PH_CODE = "PH";

const PH_REGION_NAMES: Record<string, string> = {
  NCR: "National Capital Region",
  CAR: "Cordillera Administrative Region",
  "01": "Ilocos Region",
  "02": "Cagayan Valley",
  "03": "Central Luzon",
  "4A": "Calabarzon",
  "4B": "Mimaropa",
  "05": "Bicol Region",
  "06": "Western Visayas",
  "07": "Central Visayas",
  "08": "Eastern Visayas",
  "09": "Zamboanga Peninsula",
  "10": "Northern Mindanao",
  "11": "Davao Region",
  "12": "Soccsksargen",
  "13": "Caraga",
  "14": "Bangsamoro Autonomous Region in Muslim Mindanao",
};

const POSTAL_ALIASES: Record<string, string> = {
  bacoor: "4102",
  baguio: "2600",
  caloocan: "1400",
  cebu: "6000",
  "cebu city": "6000",
  dasmarinas: "4114",
  "davao city": "8000",
  davao: "8000",
  makati: "1200",
  malabon: "1470",
  mandaluyong: "1550",
  manila: "1000",
  marikina: "1800",
  muntinlupa: "1770",
  navotas: "1485",
  paranaque: "1700",
  pasay: "1300",
  pasig: "1600",
  pateros: "1620",
  "quezon city": "1100",
  quezon: "1100",
  "san juan": "1500",
  taguig: "1630",
  valenzuela: "1440",
};

const COUNTRY_FALLBACK: Record<string, { lat: number; lng: number }> = {
  philippines: { lat: 12.8797, lng: 121.774 },
  "united states": { lat: 39.8283, lng: -98.5795 },
  canada: { lat: 56.1304, lng: -106.3468 },
  "united kingdom": { lat: 55.3781, lng: -3.436 },
  australia: { lat: -25.2744, lng: 133.7751 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  japan: { lat: 36.2048, lng: 138.2529 },
  "south korea": { lat: 35.9078, lng: 127.7669 },
  "united arab emirates": { lat: 23.4241, lng: 53.8478 },
};

const PH_ZIPCODES = zipcodes as Record<string, string | string[]>;

const NCR_BARANGAY_CITYMUN: Record<string, string> = {
  caloocan: "Caloocan City",
  "las pinas": "City Of Las Pinas",
  "las piñas": "City Of Las Pinas",
  makati: "City Of Makati",
  malabon: "City Of Malabon",
  mandaluyong: "City Of Mandaluyong",
  marikina: "City Of Marikina",
  muntinlupa: "City Of Muntinlupa",
  navotas: "City Of Navotas",
  paranaque: "City Of Paranaque",
  parañaque: "City Of Paranaque",
  pasay: "Pasay City",
  pasig: "City Of Pasig",
  pateros: "Pateros",
  quezon: "Quezon City",
  "quezon city": "Quezon City",
  "san juan": "City Of San Juan",
  taguig: "Taguig City",
  valenzuela: "City Of Valenzuela",
};

const NCR_DISTRICTS = [
  {
    value: "Capital District",
    label: "Capital District (1st District)",
    cities: ["Manila"],
  },
  {
    value: "Eastern Manila District",
    label: "Eastern Manila District (2nd District)",
    cities: ["Mandaluyong", "Marikina", "Pasig", "Quezon City", "San Juan"],
  },
  {
    value: "Northern Manila District",
    label: "Northern Manila District (3rd District)",
    cities: ["Caloocan", "Malabon", "Navotas", "Valenzuela"],
  },
  {
    value: "Southern Manila District",
    label: "Southern Manila District (4th District)",
    cities: [
      "Las Piñas",
      "Makati",
      "Muntinlupa",
      "Parañaque",
      "Pasay",
      "Pateros",
      "Taguig",
    ],
  },
];

const NCR_DISTRICT_KEYS = new Set(
  NCR_DISTRICTS.map((district) => locationKey(district.value)),
);

function clean(value?: string | null) {
  return (value ?? "").trim();
}

export function locationKey(value?: string | null) {
  return clean(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcity\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value?: string | number | null) {
  if (value == null) return undefined;
  const number = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(number) ? number : undefined;
}

function citymunKey(value?: string | null) {
  return clean(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function barangayCitymunCandidates(city: string, municipality?: string | null) {
  const selectedKey = locationKey(city);
  const municipalityKey = locationKey(municipality);
  const aliases = new Set<string>();
  const ncrAlias = NCR_BARANGAY_CITYMUN[selectedKey];
  if (ncrAlias) aliases.add(ncrAlias);
  if (clean(city) && !ncrAlias) aliases.add(clean(city));
  if (clean(municipality) && !ncrAlias) aliases.add(clean(municipality));
  if (!ncrAlias && selectedKey) {
    aliases.add(`City Of ${clean(city)}`);
    aliases.add(`${clean(city)} City`);
  }
  if (!ncrAlias && municipalityKey && municipalityKey !== selectedKey) {
    aliases.add(`City Of ${clean(municipality)}`);
    aliases.add(`${clean(municipality)} City`);
  }
  return [...aliases];
}

function barangayOptionsForCity(
  city: string,
  district: string | null | undefined,
  municipality: string | null | undefined,
  country?: string | null,
  region?: string | null,
): LocationOption[] {
  const selectedKey = locationKey(city);
  const selectedDistrict = clean(district);
  const selectedBarangays = (() => {
    if (selectedKey === "manila") {
      const shouldFilterByManilaArea =
        selectedDistrict &&
        !NCR_DISTRICT_KEYS.has(locationKey(selectedDistrict));
      return barangays
        .all()
        .filter((barangay) => String(barangay.code).startsWith("1339"))
        .filter(
          (barangay) =>
            !shouldFilterByManilaArea ||
            citymunKey(barangay.citymun) === citymunKey(selectedDistrict),
        );
    }

    const aliases = barangayCitymunCandidates(city, municipality);
    const citymunKeys = new Set(aliases.map((item) => citymunKey(item)));
    return barangays
      .all()
      .filter((barangay) => citymunKeys.has(citymunKey(barangay.citymun)));
  })();

  return uniqueOptions(
    selectedBarangays.map((barangay) => ({
      value: barangay.name,
      label:
        selectedKey === "manila"
          ? `${barangay.name} (${barangay.citymun})`
          : barangay.name,
      code: String(barangay.code),
      ...coordsForName(municipality ?? city, country, region),
    })),
  );
}

export function getDistrictOptions(
  country?: string | null,
  region?: string | null,
  city?: string | null,
): LocationOption[] {
  const code = countryCode(country);
  if (code !== PH_CODE) return [];
  const regionCode = selectedRegionCode(country, region);
  if (regionCode !== "NCR") return [];

  const cityKey = locationKey(city);
  return NCR_DISTRICTS.filter(
    (district) =>
      !cityKey ||
      district.cities.some(
        (districtCity) => locationKey(districtCity) === cityKey,
      ),
  ).map((district) => ({
    value: district.value,
    label: district.label,
    code: district.value,
    ...coordsForName(district.cities[0] ?? "Manila", country, region),
  }));
}

function uniqueOptions(options: LocationOption[]) {
  const seen = new Set<string>();
  return options
    .filter((option) => {
      const key = locationKey(option.value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function countryFor(country?: string | null) {
  const target = clean(country);
  if (!target) return undefined;
  return (
    Country.getAllCountries().find(
      (item) =>
        item.name === target ||
        item.isoCode === target ||
        locationKey(item.name) === locationKey(target),
    ) ?? undefined
  );
}

function countryCode(country?: string | null) {
  return countryFor(country)?.isoCode ?? "";
}

function inferredCountry(selection: LocationSelection) {
  if (clean(selection.country)) return selection.country;
  return clean(selection.province) ||
    clean(selection.city) ||
    clean(selection.town)
    ? PHILIPPINES
    : "";
}

function phRegions(): LocationOption[] {
  return uniqueOptions(
    regions.all().map((region) => {
      const state =
        State.getStateByCodeAndCountry(region.designation, PH_CODE) ??
        State.getStatesOfCountry(PH_CODE).find(
          (item) =>
            item.isoCode === region.designation ||
            item.name === PH_REGION_NAMES[region.designation],
        );
      return {
        value: region.name,
        label: `${region.name} (${region.designation})`,
        code: state?.isoCode ?? region.designation,
        latitude: toNumber(state?.latitude),
        longitude: toNumber(state?.longitude),
      };
    }),
  );
}

function selectedRegionCode(
  country: string | null | undefined,
  region?: string | null,
) {
  const value = clean(region);
  if (!value) return undefined;
  const state = getRegionOptions(country).find(
    (item) =>
      item.value === value ||
      item.code === value ||
      locationKey(item.value) === locationKey(value) ||
      locationKey(item.label) === locationKey(value) ||
      (item.code === "NCR" && locationKey(value) === "metro manila"),
  );
  return state?.code;
}

export function getCountryOptions(): LocationOption[] {
  return Country.getAllCountries()
    .map((country) => ({
      value: country.name,
      label: country.name,
      code: country.isoCode,
      latitude: toNumber(country.latitude),
      longitude: toNumber(country.longitude),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getRegionOptions(country?: string | null): LocationOption[] {
  const code = countryCode(country);
  if (!code) return [];
  if (code === PH_CODE) return phRegions();
  return uniqueOptions(
    State.getStatesOfCountry(code).map((state) => ({
      value: state.name,
      label: state.name,
      code: state.isoCode,
      latitude: toNumber(state.latitude),
      longitude: toNumber(state.longitude),
    })),
  );
}

export function getCityOptions(
  country?: string | null,
  region?: string | null,
  district?: string | null,
): LocationOption[] {
  const code = countryCode(country);
  if (!code) return [];
  const regionCode = selectedRegionCode(country, region);
  const selectedDistrict = NCR_DISTRICTS.find(
    (item) => locationKey(item.value) === locationKey(district),
  );
  if (code === PH_CODE) {
    const designation = getRegionOptions(country).find(
      (item) => item.code === regionCode,
    )?.label;
    const psgcRegion =
      regions
        .all()
        .find(
          (item) =>
            item.designation === regionCode ||
            item.name === region ||
            item.name === designation,
        ) ?? null;
    if (psgcRegion) {
      const options = uniqueOptions(
        psgcRegion.provinces.flatMap((province) => {
          const mappedProvince = provinces.find(province.name);
          return (mappedProvince?.municipalities ?? []).map((municipality) => {
            const displayName =
              municipality.name === "Quezon"
                ? "Quezon City"
                : municipality.name;
            return {
              value: displayName,
              label: displayName,
              code: municipality.name,
              ...coordsForName(municipality.name, country, region),
            };
          });
        }),
      );
      if (regionCode === "NCR" && selectedDistrict) {
        const districtCityKeys = new Set(
          selectedDistrict.cities.map((city) => locationKey(city)),
        );
        return options.filter((option) =>
          districtCityKeys.has(locationKey(option.value)),
        );
      }
      return options;
    }
  }
  if (!regionCode) return [];
  return uniqueOptions(
    City.getCitiesOfState(code, regionCode).map((city) => ({
      value: city.name,
      label: city.name,
      code: city.name,
      latitude: toNumber(city.latitude),
      longitude: toNumber(city.longitude),
    })),
  );
}

export function getTownOptions(
  country?: string | null,
  region?: string | null,
  city?: string | null,
  district?: string | null,
): LocationOption[] {
  const code = countryCode(country);
  if (!code) return [];
  const selectedCity = clean(city);
  if (!selectedCity) return [];

  if (code === PH_CODE) {
    const regionCode = selectedRegionCode(country, region);
    const psgcRegion =
      regions.all().find((item) => item.designation === regionCode) ?? null;
    const regionProvinceNames = new Set(
      psgcRegion?.provinces.map((province) => province.name) ?? [],
    );
    const municipality =
      municipalities
        .all()
        .find(
          (item) =>
            regionProvinceNames.has(item.province) &&
            (locationKey(item.name) === locationKey(selectedCity) ||
              (locationKey(item.name) === "quezon" &&
                locationKey(selectedCity) === "quezon")),
        ) ?? null;
    return barangayOptionsForCity(
      selectedCity,
      district,
      municipality?.name,
      country,
      region,
    );
  }

  return [];
}

function coordsForName(
  name: string,
  country?: string | null,
  region?: string | null,
  city?: string | null,
) {
  const code = countryCode(country);
  const regionCode = selectedRegionCode(country, region);
  const candidates = regionCode
    ? City.getCitiesOfState(code, regionCode)
    : (City.getCitiesOfCountry(code) ?? []);
  const direct = candidates.find(
    (item) =>
      locationKey(item.name) === locationKey(name) ||
      locationKey(item.name) === locationKey(`${name} City`),
  );
  const cityMatch = city
    ? candidates.find((item) => locationKey(item.name) === locationKey(city))
    : null;
  const match = direct ?? cityMatch;
  const latitude = toNumber(match?.latitude);
  const longitude = toNumber(match?.longitude);
  return latitude != null && longitude != null ? { latitude, longitude } : {};
}

export function findLocationCoordinates(selection: LocationSelection) {
  const withCountry = { ...selection, country: inferredCountry(selection) };
  const town = clean(selection.town);
  if (town) {
    const coords = coordsForName(
      town,
      withCountry.country,
      withCountry.province,
      withCountry.city,
    );
    if (coords.latitude != null && coords.longitude != null) return coords;
  }

  const city = clean(selection.city);
  if (city) {
    const coords = coordsForName(
      city,
      withCountry.country,
      withCountry.province,
    );
    if (coords.latitude != null && coords.longitude != null) return coords;
  }

  const region = getRegionOptions(withCountry.country).find(
    (item) => locationKey(item.value) === locationKey(selection.province),
  );
  if (region?.latitude != null && region.longitude != null) {
    return { latitude: region.latitude, longitude: region.longitude };
  }

  const country = countryFor(withCountry.country);
  const latitude = toNumber(country?.latitude);
  const longitude = toNumber(country?.longitude);
  if (latitude != null && longitude != null) return { latitude, longitude };

  const fallback = COUNTRY_FALLBACK[locationKey(withCountry.country)];
  return fallback ? { latitude: fallback.lat, longitude: fallback.lng } : null;
}

export function postalCodeFor(selection: LocationSelection) {
  const country = countryFor(selection.country);
  if (country?.isoCode !== PH_CODE) return "";
  const keys = [
    selection.town,
    selection.city,
    `${selection.town ?? ""} ${selection.city ?? ""}`,
  ];
  for (const value of keys) {
    const postal = POSTAL_ALIASES[locationKey(value)];
    if (postal) return postal;
    const directoryPostal = reversePhilippineZip(value);
    if (directoryPostal) return directoryPostal;
  }
  return "";
}

function reversePhilippineZip(value?: string | null) {
  const target = locationKey(value);
  if (!target) return "";
  for (const [zip, raw] of Object.entries(PH_ZIPCODES)) {
    const locations = Array.isArray(raw) ? raw : [raw];
    if (
      locations.some((location) => {
        const candidate = locationKey(location);
        return (
          candidate === target ||
          candidate.startsWith(`${target} `) ||
          candidate.startsWith(`${target} cpo`) ||
          candidate.startsWith(`${target} central post office`)
        );
      })
    ) {
      return zip;
    }
  }
  return "";
}

export function locationLabel(selection: LocationSelection) {
  return [
    selection.town,
    selection.district,
    selection.city,
    selection.province,
    selection.country,
  ]
    .map((part) => clean(part))
    .filter(Boolean)
    .join(", ");
}
