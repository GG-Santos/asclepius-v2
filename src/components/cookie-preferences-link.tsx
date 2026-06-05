"use client";

import { openConsentPreferences } from "@/lib/consent";

export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openConsentPreferences}
      className={className}
    >
      Cookie preferences
    </button>
  );
}
