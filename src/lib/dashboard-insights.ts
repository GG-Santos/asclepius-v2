import type { AdminAnalytics } from "@/lib/analytics";

// Deterministic interpretation of the analytics object — no LLM, no I/O.
// buildInsights() → the headline summary (worst risk first, capped at 3 lines).
// buildAlerts()   → the prioritized "needs attention" worklist, each row
// carrying the action verb and the pre-filtered drill-down href.

export type Severity = "p0" | "p1" | "p2";
export type InsightTone = Severity | "ok" | "info";
export type InsightLine = { tone: InsightTone; text: string };
export type Alert = {
  severity: Severity;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
};

const s = (n: number) => (n === 1 ? "" : "s");
const inquiryWord = (n: number) => (n === 1 ? "inquiry" : "inquiries");

export function buildInsights(a: AdminAnalytics): InsightLine[] {
  const out: InsightLine[] = [];

  // 1 — compliance risk leads, always.
  if (a.totals.lapsedListed > 0) {
    out.push({
      tone: "p0",
      text: `${a.totals.lapsedListed} expired license${s(a.totals.lapsedListed)} still publicly listed as valid — resolve now.`,
    });
  } else {
    out.push({
      tone: "ok",
      text: "Registry clean — no expired licenses are publicly listed as valid.",
    });
  }

  // 2 — public trust / usage signal.
  if (a.verification.volume > 0 && a.verification.foundRate != null) {
    const d = a.verification.volumeDeltaPct;
    const trend =
      d == null
        ? ""
        : ` ${d >= 0 ? "up" : "down"} ${Math.abs(d)}% vs prior ${a.range}d`;
    out.push({
      tone: "info",
      text: `${a.verification.volume.toLocaleString()} verifications${trend}; ${a.verification.foundRate}% resolving successfully.`,
    });
  }

  // 3 — the most imminent operational item.
  if (a.totals.expiring30 > 0) {
    out.push({
      tone: "p1",
      text: `${a.totals.expiring30} credential${s(a.totals.expiring30)} expire within 30 days.`,
    });
  } else if (a.inquiriesNew > 0) {
    out.push({
      tone: "p1",
      text: `${a.inquiriesNew} new ${inquiryWord(a.inquiriesNew)} awaiting contact.`,
    });
  } else if (a.totals.undated > 0) {
    out.push({
      tone: "p2",
      text: `${a.totals.undated} licensed record${s(a.totals.undated)} have no expiry date and can't be verified.`,
    });
  }

  return out.slice(0, 3);
}

const RANK: Record<Severity, number> = { p0: 0, p1: 1, p2: 2 };

export function buildAlerts(a: AdminAnalytics): Alert[] {
  const alerts: Alert[] = [];

  if (a.totals.lapsedListed > 0) {
    alerts.push({
      severity: "p0",
      title: `${a.totals.lapsedListed} license${s(a.totals.lapsedListed)} expired but listed`,
      detail: "Publicly verifiable as valid while expired — compliance risk.",
      actionLabel: "Review & archive",
      href: "/dashboard/graduates?status=GRADUATE&state=expired",
    });
  }

  if (a.totals.expiring90 > 0) {
    alerts.push({
      severity: "p1",
      title: `${a.totals.expiring90} expiring within 90 days`,
      detail: `${a.totals.expiring30} within 30 days — chase re-certification.`,
      actionLabel: "Open chase list",
      href: "/dashboard/graduates?status=GRADUATE&state=expiring",
    });
  }

  if (a.inquiriesNew > 0) {
    alerts.push({
      severity: "p1",
      title: `${a.inquiriesNew} new ${inquiryWord(a.inquiriesNew)} awaiting contact`,
      detail: "Unworked enrollment leads.",
      actionLabel: "Contact leads",
      href: "/dashboard/inquiries?status=NEW",
    });
  }

  if (a.totals.undated > 0) {
    alerts.push({
      severity: "p2",
      title: `${a.totals.undated} record${s(a.totals.undated)} missing expiry date`,
      detail: "Shown as valid by default — cannot be confirmed.",
      actionLabel: "Fix records",
      href: "/dashboard/graduates?status=GRADUATE&state=undated",
    });
  }

  return alerts.sort((x, y) => RANK[x.severity] - RANK[y.severity]);
}
