import {
  CalendarClock,
  CircleCheck,
  CircleX,
  FileText,
  GraduationCap,
  Layers,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  BatchChart,
  LookupsChart,
} from "@/components/dashboard/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAnalytics } from "@/lib/analytics";
import { getSession } from "@/lib/session";

function SectionCard({
  icon: Icon,
  label,
  value,
  context,
  tone = "accent",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  context?: string;
  tone?: "accent" | "warning" | "success";
}) {
  const toneCls =
    tone === "warning"
      ? "bg-secondary/10 text-secondary"
      : tone === "success"
        ? "bg-success/10 text-success"
        : "bg-accent/10 text-accent";
  return (
    <Card className="transition-shadow hover:shadow-[var(--shadow-clinical-md)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-on-surface-variant">{label}</p>
          <span
            className={`flex size-9 items-center justify-center rounded-lg ${toneCls}`}
          >
            <Icon className="size-4.5" />
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-on-surface tabular">
          {value.toLocaleString()}
        </p>
        {context && (
          <p className="mt-1 text-xs text-on-surface-variant">{context}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardOverview({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const session = await getSession();
  const { denied } = await searchParams;
  const role = session?.user.role ?? "writer";
  const firstName = session?.user.name?.split(" ")[0] ?? "there";

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-[1000px] space-y-6">
        <h1 className="text-2xl font-bold text-on-surface">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-on-surface-variant">
          Write and manage blog posts.
        </p>
        <Link href="/dashboard/blog">
          <Card className="max-w-sm transition-shadow hover:shadow-[var(--shadow-clinical-md)]">
            <CardHeader>
              <FileText className="size-6 text-accent" />
              <CardTitle>Blog</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-on-surface-variant">
              Draft and publish articles for the public site.
            </CardContent>
          </Card>
        </Link>
      </div>
    );
  }

  const a = await getAdminAnalytics();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Registry &amp; content analytics.
        </p>
      </div>

      {denied && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-warning">
            <TriangleAlert className="size-5 shrink-0" />
            <span>That area is restricted to administrators.</span>
          </CardContent>
        </Card>
      )}

      {/* Section cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard
          icon={GraduationCap}
          label="Licensed graduates"
          value={a.totals.licensed}
          context={`of ${a.totals.graduates.toLocaleString()} total records`}
          tone="success"
        />
        <SectionCard
          icon={Layers}
          label="Students in training"
          value={a.totals.students}
          context={`${a.totals.batches} batches`}
        />
        <SectionCard
          icon={CalendarClock}
          label="Expiring ≤ 90 days"
          value={a.totals.expiringSoon}
          context="needs re-certification"
          tone="warning"
        />
        <SectionCard
          icon={Search}
          label="Verifications (30d)"
          value={a.lookups30d}
          context={`${a.posts.published} blog posts live`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Verification lookups (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LookupsChart data={a.lookupSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Records per batch</CardTitle>
          </CardHeader>
          <CardContent>
            {a.batchSeries.length === 0 ? (
              <p className="py-10 text-center text-sm text-on-surface-variant">
                No batch data yet — run the migration or add records.
              </p>
            ) : (
              <BatchChart data={a.batchSeries} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actionable panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Expiring soon</CardTitle>
            <Link
              href="/dashboard/graduates?status=GRADUATE"
              className="text-xs font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {a.expiringList.length === 0 ? (
              <p className="py-6 text-center text-sm text-on-surface-variant">
                No credentials expiring in the next 90 days.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {a.expiringList.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/dashboard/graduates/${e.id}/edit`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent"
                    >
                      <span className="min-w-0 truncate font-medium text-on-surface">
                        {e.name}
                      </span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs text-on-surface-variant">
                          {e.lcn}
                        </span>
                        <span className="text-xs text-secondary">
                          {e.expirationRaw ?? "—"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent verifications</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {a.recentLookups.length === 0 ? (
              <p className="py-6 text-center text-sm text-on-surface-variant">
                No verification lookups yet.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {a.recentLookups.map((r, i) => (
                  <li
                    key={`${r.lcn}-${r.at}-${i}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {r.found ? (
                        <CircleCheck className="size-4 text-success" />
                      ) : (
                        <CircleX className="size-4 text-secondary" />
                      )}
                      <span className="font-mono text-xs text-on-surface">
                        {r.lcn}
                      </span>
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {new Date(r.at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            href: "/dashboard/students/new",
            label: "Add student",
            icon: GraduationCap,
          },
          {
            href: "/dashboard/graduates/new",
            label: "Add graduate",
            icon: Users,
          },
          { href: "/dashboard/blog/new", label: "Write post", icon: FileText },
        ].map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="transition-shadow hover:shadow-[var(--shadow-clinical-md)]">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <q.icon className="size-4.5" />
                </span>
                <span className="font-medium text-on-surface">{q.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
