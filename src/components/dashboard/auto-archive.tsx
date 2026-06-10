"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { autoArchiveExpired } from "@/app/dashboard/graduates/actions";

// Fire-and-forget: once per admin session, archive licenses expired 2+ years.
// Renders nothing. Guarded by sessionStorage so it runs once per tab session.
export function AutoArchiveExpired() {
  useEffect(() => {
    const KEY = "auto-archive-expired-ran";
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    autoArchiveExpired()
      .then((r) => {
        if (r.archived > 0) {
          toast.message(
            `${r.archived} license${
              r.archived === 1 ? "" : "s"
            } expired 2+ years — auto-archived.`,
          );
        }
      })
      .catch(() => {
        // non-admin or transient error — ignore
      });
  }, []);
  return null;
}
