"use client";

// Lightweight, self-contained cookie-consent store. No external dependency.
// Persists to localStorage (for the UI) and a cookie (so the choice can be read
// server-side later if analytics gating is added).

export type ConsentCategories = {
  necessary: true; // always required
  analytics: boolean;
};

export type ConsentRecord = {
  v: 1;
  categories: ConsentCategories;
  at: string;
};

const KEY = "asclepius:consent";
const COOKIE = "asclepius_consent";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

/** Fired to (re)open the preferences UI from anywhere, e.g. a footer link. */
export const CONSENT_OPEN_EVENT = "asclepius:consent-open";
/** Fired after a choice is saved, so listeners can react. */
export const CONSENT_CHANGE_EVENT = "asclepius:consent-change";

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): ConsentRecord {
  const record: ConsentRecord = {
    v: 1,
    categories: { necessary: true, analytics },
    at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record));
    // biome-ignore lint/suspicious/noDocumentCookie: simple consent cookie for optional future server-side gating
    document.cookie = `${COOKIE}=${analytics ? "all" : "necessary"}; path=/; max-age=${MAX_AGE}; samesite=lax`;
    window.dispatchEvent(
      new CustomEvent(CONSENT_CHANGE_EVENT, { detail: record }),
    );
  } catch {
    // storage may be unavailable (private mode); the banner still dismisses.
  }
  return record;
}

export function openConsentPreferences() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
