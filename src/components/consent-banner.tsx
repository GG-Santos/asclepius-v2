"use client";

import { Cookie, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CONSENT_OPEN_EVENT, readConsent, writeConsent } from "@/lib/consent";

export function ConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    setMounted(true);
    const existing = readConsent();
    if (!existing) setVisible(true);
    else setAnalytics(existing.categories.analytics);

    const open = () => {
      const cur = readConsent();
      if (cur) setAnalytics(cur.categories.analytics);
      setCustomizeOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, []);

  const decide = useCallback((value: boolean) => {
    writeConsent(value);
    setVisible(false);
    setCustomizeOpen(false);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:bottom-4 sm:left-4 sm:right-auto sm:p-0"
        >
          <div className="mx-auto w-full max-w-md rounded-lg border border-outline-variant/60 bg-card p-5 shadow-[var(--shadow-clinical-md)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Cookie className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-on-surface">
                  We value your privacy
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  We use essential cookies to run the registry and verification.
                  Optional analytics cookies help us improve the site. You
                  decide.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => decide(true)} className="sm:flex-1">
                Accept all
              </Button>
              <Button
                variant="outline"
                onClick={() => decide(false)}
                className="sm:flex-1"
              >
                Reject optional
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCustomizeOpen(true)}
                className="sm:flex-1"
              >
                Customize
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Choose which cookies Asclepius may use. You can change this
              anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 rounded-md border border-outline-variant/60 bg-surface-low p-4">
              <div>
                <p className="flex items-center gap-1.5 font-medium text-on-surface">
                  <ShieldCheck className="size-4 text-accent" aria-hidden />
                  Essential
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Required for sign-in, security, and license verification.
                  Always on.
                </p>
              </div>
              <span className="mt-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                Always on
              </span>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-outline-variant/60 p-4">
              <div>
                <p className="font-medium text-on-surface">Analytics</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Anonymous usage statistics to help us improve the registry.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 size-5 accent-[var(--color-accent)]"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => decide(false)}>
              Reject optional
            </Button>
            <Button onClick={() => decide(analytics)}>Save preferences</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
