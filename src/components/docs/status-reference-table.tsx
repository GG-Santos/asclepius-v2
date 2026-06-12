import { StatusBadge } from "./status-badge";

const ROWS = [
  {
    status: "verified" as const,
    meaning:
      "Graduate status is active and the expiry date is still in the future.",
    publicResult:
      "The verify page shows profile details, scores, card, and certificate.",
    action: "No action unless the record data is wrong.",
  },
  {
    status: "expired" as const,
    meaning: "The expiry date has passed, but the registry record is retained.",
    publicResult: "The verify page warns that the license is expired.",
    action: "Renew, recertify, or archive after checking source documents.",
  },
  {
    status: "archived" as const,
    meaning:
      "The record is retained for admin history but removed from public verification.",
    publicResult: "The verify page returns the not-found flow.",
    action: "Use for records that should not behave as active credentials.",
  },
  {
    status: "legacy" as const,
    meaning: "Batch 5 records have no per-assessment grade book on file.",
    publicResult:
      "The profile remains valid when not expired, with legacy score context.",
    action: "Do not invent missing score rows.",
  },
];

export function StatusReferenceTable() {
  return (
    <>
      <div className="not-prose my-6 grid gap-3 md:hidden">
        {ROWS.map((r) => (
          <section
            key={r.status}
            className="docs-motion-card rounded-lg border border-outline-variant/60 bg-card p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <StatusBadge status={r.status} />
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-on-surface">Meaning</dt>
                <dd className="mt-1 text-on-surface-variant">{r.meaning}</dd>
              </div>
              <div>
                <dt className="font-semibold text-on-surface">Public result</dt>
                <dd className="mt-1 text-on-surface-variant">
                  {r.publicResult}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-on-surface">Admin action</dt>
                <dd className="mt-1 text-on-surface-variant">{r.action}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
      <div className="not-prose my-6 hidden overflow-x-auto rounded-lg border border-outline-variant/60 md:block">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-low text-left text-on-surface">
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Meaning</th>
              <th className="px-4 py-2.5 font-semibold">Public result</th>
              <th className="px-4 py-2.5 font-semibold">Admin action</th>
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
                <td className="px-4 py-3">{r.publicResult}</td>
                <td className="px-4 py-3">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
