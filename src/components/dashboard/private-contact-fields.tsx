"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import {
  findLocationCoordinates,
  getCityOptions,
  getCountryOptions,
  getRegionOptions,
  getTownOptions,
  postalCodeFor,
} from "@/lib/location-options";

export type PrivateContactDefaults = {
  phone?: string;
  gender?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  town?: string;
  country?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  mapsUrl?: string;
};

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
  const [town, setTown] = useState(defaults.town ?? "");
  const [country, setCountry] = useState(defaults.country ?? "");
  const [postalCode, setPostalCode] = useState(defaults.postalCode ?? "");
  const mapsUrl = defaults.mapsUrl ?? "";

  const countryOptions = useMemo(() => getCountryOptions(), []);
  const regionOptions = useMemo(() => getRegionOptions(country), [country]);
  const cityOptions = useMemo(
    () => getCityOptions(country, province),
    [country, province],
  );
  const townOptions = useMemo(
    () => getTownOptions(country, province, city),
    [country, province, city],
  );
  const coordinates = useMemo(
    () => findLocationCoordinates({ country, province, city, town }),
    [country, province, city, town],
  );
  const generatedPostalCode = useMemo(
    () => postalCodeFor({ country, province, city, town }),
    [country, province, city, town],
  );
  const lat =
    coordinates?.latitude != null
      ? String(coordinates.latitude)
      : (defaults.latitude ?? "");
  const lng =
    coordinates?.longitude != null
      ? String(coordinates.longitude)
      : (defaults.longitude ?? "");

  useEffect(() => {
    if (generatedPostalCode) setPostalCode(generatedPostalCode);
  }, [generatedPostalCode]);

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:col-span-2 sm:grid-cols-6">
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />
      <input type="hidden" name="mapsUrl" value={mapsUrl} />
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
      <Labeled label="Country" className="sm:col-span-3">
        <Select
          name="country"
          value={country}
          onChange={(event) => {
            setCountry(event.currentTarget.value);
            setProvince("");
            setCity("");
            setTown("");
          }}
          autoComplete="country-name"
        >
          <option value="">Not specified</option>
          {countryOptions.map((option) => (
            <option key={option.code ?? option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Labeled>
      <Labeled label="Region / state" className="sm:col-span-2">
        <Select
          name="province"
          value={province}
          onChange={(event) => {
            setProvince(event.currentTarget.value);
            setCity("");
            setTown("");
          }}
          autoComplete="address-level1"
        >
          <option value="">Not specified</option>
          {regionOptions.map((option) => (
            <option key={option.code ?? option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Labeled>
      <Labeled label="City" className="sm:col-span-2">
        <Select
          name="city"
          value={city}
          onChange={(event) => {
            setCity(event.currentTarget.value);
            setTown("");
          }}
          autoComplete="address-level2"
          disabled={!province || cityOptions.length === 0}
        >
          <option value="">Not specified</option>
          {cityOptions.map((option) => (
            <option key={option.code ?? option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Labeled>
      <Labeled label="Town / barangay" className="sm:col-span-2">
        <Select
          name="town"
          value={town}
          onChange={(event) => setTown(event.currentTarget.value)}
          disabled={!city || townOptions.length === 0}
        >
          <option value="">Not specified</option>
          {townOptions.map((option) => (
            <option key={option.code ?? option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Labeled>
      <Labeled label="ZIP / postal code" className="sm:col-span-2">
        <Input
          name="postalCode"
          value={postalCode}
          onChange={(event) => setPostalCode(event.currentTarget.value)}
          placeholder="Auto-filled when known"
          autoComplete="postal-code"
        />
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
