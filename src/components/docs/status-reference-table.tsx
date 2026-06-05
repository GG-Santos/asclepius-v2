import { StatusBadge } from "./status-badge";

const ROWS = [
  {
    status: "verified" as const,
    meaning: "Active in the registry and not past its expiry date.",
    shows: "Profile, proficiency scores, license card, and certificate.",
    valid: "Yes",
  },
  {
    status: "expired" as const,
    meaning: "Past the valid-until date. The record is retained.",
    shows: "The same record, flagged as expired.",
    valid: "No — renewal required",
  },
  {
    status: "legacy" as const,
    meaning: "Batch 16 or earlier, graded before automated scoring.",
    shows: "Profile, card, and certificate. Proficiency scores not on file.",
    valid: "Yes — unaffected",
  },
];

// Canonical credential-status matrix. The Legacy threshold (batch <= 16) is the
// source of truth in src/lib/graduate.ts (isLegacyBatch). Keep them in sync.
export function StatusReferenceTable() {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-low text-left text-on-surface">
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 font-semibold">Meaning</th>
            <th className="px-4 py-2.5 font-semibold">What&apos;s shown</th>
            <th className="px-4 py-2.5 font-semibold">License valid?</th>
          </tr>
        </thead>
        <tbody className="text-on-surface-variant">
          {ROWS.map((r) => (
            <tr
              key={r.status}
              className="border-t border-outline-variant/60 align-top"
            >
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3">{r.meaning}</td>
              <td className="px-4 py-3">{r.shows}</td>
              <td className="px-4 py-3 font-medium text-on-surface">
                {r.valid}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
