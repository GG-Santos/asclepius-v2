"use client";

import { Activity, Cookie, ShieldCheck } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
      {visible && !customizeOpen && (
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-x-hidden overflow-y-auto p-0">
          <DialogHeader className="border-b border-outline-variant/60 bg-surface-low px-5 py-5 pr-12">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/10 text-accent">
                <Cookie className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogTitle>Cookie preferences</DialogTitle>
                <DialogDescription className="mt-1">
                  Choose which cookies Asclepius may use. You can change this
                  anytime.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 px-5 py-4">
            <div className="rounded-md border border-outline-variant/60 bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-on-surface">
                    <ShieldCheck className="size-4 text-accent" aria-hidden />
                    Essential
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Required for sign-in, security, and license verification.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  Always on
                </span>
              </div>
            </div>

            <label className="group block cursor-pointer rounded-md border border-outline-variant/60 bg-card p-4 transition-colors hover:border-accent/50 focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-1 focus-within:ring-offset-background">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-on-surface">
                    <Activity className="size-4 text-accent" aria-hidden />
                    Analytics
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Anonymous usage statistics to help us improve the registry.
                  </p>
                </div>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors",
                    analytics
                      ? "border-accent bg-accent"
                      : "border-outline-variant bg-surface-container",
                  )}
                >
                  <span
                    className={cn(
                      "size-5 rounded-full bg-card shadow-[var(--shadow-clinical)] transition-transform",
                      analytics && "translate-x-5",
                    )}
                  />
                </span>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="sr-only"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/60 bg-surface-low px-5 py-4 sm:flex-row sm:justify-end">
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
