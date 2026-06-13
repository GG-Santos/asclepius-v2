"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";

export type PrivateContactDefaults = {
  phone?: string;
  gender?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  country?: string;
  mapsUrl?: string;
};

const LOCATION_COUNTRIES = [
  "Philippines",
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Singapore",
  "Japan",
  "South Korea",
  "United Arab Emirates",
] as const;

function normalizePhoneValue(phone?: string) {
  const raw = phone?.trim() ?? "";
  if (!raw) return "";
  if (raw.startsWith("+")) return `+${raw.slice(1).replace(/\D/g, "")}`;

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return `+63${digits}`;
  }
  return digits ? `+${digits}` : "";
}

function normalizeSex(value?: string) {
  const raw = value?.trim().toLowerCase();
  if (raw === "male") return "Male";
  if (raw === "female") return "Female";
  if (raw === "other" || raw === "others") return "Others";
  return "";
}

function googleMapsUrl({
  streetAddress,
  city,
  province,
  country,
}: {
  streetAddress: string;
  city: string;
  province: string;
  country: string;
}) {
  const query = [streetAddress, city, province, country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query,
      )}`
    : "";
}

export function PrivateContactFields({
  defaults = {},
}: {
  defaults?: PrivateContactDefaults;
}) {
  const [phone, setPhone] = useState(() => normalizePhoneValue(defaults.phone));
  const [streetAddress, setStreetAddress] = useState(
    defaults.streetAddress ?? "",
  );
  const [city, setCity] = useState(defaults.city ?? "");
  const [province, setProvince] = useState(defaults.province ?? "");
  const [country, setCountry] = useState(defaults.country ?? "Philippines");
  const [mapsUrl, setMapsUrl] = useState(defaults.mapsUrl ?? "");

  const generatedMapsUrl = useMemo(
    () => googleMapsUrl({ streetAddress, city, province, country }),
    [streetAddress, city, province, country],
  );
  const activeMapsUrl = mapsUrl.trim() || generatedMapsUrl;
  const customCountry =
    country && !LOCATION_COUNTRIES.some((name) => name === country)
      ? country
      : null;

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:col-span-2 sm:grid-cols-6">
      <input type="hidden" name="phone" value={phone} />
      <Labeled label="Phone number" className="sm:col-span-3">
        <PhoneInput
          defaultCountry="PH"
          international
          countryCallingCodeEditable={false}
          value={phone}
          onChange={setPhone}
          placeholder="912 345 6789"
          autoComplete="tel"
        />
      </Labeled>
      <Labeled label="Sex" className="sm:col-span-3">
        <Select name="gender" defaultValue={normalizeSex(defaults.gender)}>
          <option value="">Not specified</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Others">Others</option>
        </Select>
      </Labeled>

      <Labeled label="Street address" className="sm:col-span-3">
        <Input
          name="streetAddress"
          value={streetAddress}
          onChange={(event) => setStreetAddress(event.currentTarget.value)}
          placeholder="House/building, street, barangay"
          autoComplete="street-address"
        />
      </Labeled>
      <Labeled label="City" className="sm:col-span-3">
        <Input
          name="city"
          value={city}
          onChange={(event) => setCity(event.currentTarget.value)}
          placeholder="City"
          autoComplete="address-level2"
        />
      </Labeled>
      <Labeled label="Province / State" className="sm:col-span-3">
        <Input
          name="province"
          value={province}
          onChange={(event) => setProvince(event.currentTarget.value)}
          placeholder="Province or state"
          autoComplete="address-level1"
        />
      </Labeled>
      <Labeled label="Country" className="sm:col-span-3">
        <Select
          name="country"
          value={country}
          onChange={(event) => setCountry(event.currentTarget.value)}
          autoComplete="country-name"
        >
          <option value="">Not specified</option>
          {customCountry && (
            <option value={customCountry}>{customCountry}</option>
          )}
          {LOCATION_COUNTRIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Labeled>
      <Labeled label="Google Maps pinpoint" className="sm:col-span-6">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input
            name="mapsUrl"
            type="url"
            value={mapsUrl}
            onChange={(event) => setMapsUrl(event.currentTarget.value)}
            placeholder="Paste a saved Google Maps pin URL, or use the generated link"
          />
          <a
            href={activeMapsUrl || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!activeMapsUrl}
            className="inline-flex h-11 items-center justify-center gap-2 rounded border border-outline-variant bg-card px-3 text-sm font-semibold text-on-surface transition-colors hover:border-accent hover:text-accent aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            <MapPin className="size-4" aria-hidden />
            Open pin
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
        {generatedMapsUrl && (
          <p className="mt-1 text-xs text-on-surface-variant">
            Generated from the private address. Paste a more precise pin URL if
            Google Maps needs correction.
          </p>
        )}
      </Labeled>
      <p className="sm:col-span-6 text-xs text-on-surface-variant">
        Private admin/contact fields. Public verification never shows phone,
        sex, or address details.
      </p>
    </div>
  );
}

function Labeled({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the form control is passed in via children
    <label className={className ? `block ${className}` : "block"}>
      <span className="mb-1 block text-sm font-medium text-on-surface">
        {label}
      </span>
      {children}
    </label>
  );
}
