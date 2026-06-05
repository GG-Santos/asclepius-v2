import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-accent/10 text-accent",
  CONTACTED: "bg-warning/10 text-warning",
  CLOSED: "bg-success/10 text-success",
};

export default async function InquiriesPage() {
  await requireAdmin();
  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">
          Admissions inquiries
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Training requests submitted from the public enrollment form.{" "}
          {inquiries.length} total.
        </p>
      </div>

      {inquiries.length === 0 ? (
        <p className="rounded-lg border border-outline-variant bg-card p-8 text-center text-sm text-on-surface-variant">
          No inquiries yet. Requests from the /enroll form will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Program</th>
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {inquiries.map((q) => (
                <tr key={q.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{q.name}</p>
                    {q.message && (
                      <p className="mt-1 max-w-xs text-xs text-on-surface-variant">
                        {q.message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <p>{q.email}</p>
                    {q.phone && <p className="text-xs">{q.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {q.program ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                    {q.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[q.status] ?? ""}`}
                    >
                      {q.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
