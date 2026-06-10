"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { BatchPoint, LookupPoint, StatusSlice } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/*
 * Chart plumbing — token-bound (R3). Values resolve from CSS variables
 * declared in globals.css, so charts track theme changes with zero JS
 * theme-detection and zero hardcoded color values.
 */
const C = {
  axis: "var(--chart-axis)",
  grid: "var(--chart-grid)",
  tooltip: {
    borderRadius: 8,
    border: "1px solid var(--chart-tooltip-border)",
    fontSize: 12,
    background: "var(--chart-tooltip-bg)",
    color: "var(--chart-tooltip-fg)",
  },
  barFill: "var(--chart-bar)",
  barCursor: "var(--chart-bar-cursor)",
};

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="flex h-[240px] items-center justify-center px-6 text-center text-sm text-on-surface-variant">
      {message}
    </p>
  );
}

/**
 * Verification volume (bars, left axis) + found-rate % (line, right axis) over
 * time, with a dashed prior-period ghost and a 95% target line. Answers: "is
 * the registry being used, and is it resolving lookups?"
 */
const verifConfig = {
  total: { label: "Verifications", color: "var(--color-chart-1)" },
  rate: { label: "Found-rate %", color: "var(--color-chart-2)" },
  prevTotal: { label: "Prev period", color: "var(--color-outline)" },
} satisfies ChartConfig;

export function VerificationTrendChart({ data }: { data: LookupPoint[] }) {
  const rows = data.map((d) => ({ ...d, total: d.found + d.notFound }));
  const totalVolume = rows.reduce((s, r) => s + r.total, 0);
  if (totalVolume === 0) {
    return <EmptyChart message="No verification lookups in this period yet." />;
  }
  return (
    <ChartContainer
      config={verifConfig}
      className="aspect-auto h-[260px] w-full"
    >
      <ComposedChart
        data={rows}
        margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
      >
        <defs>
          <linearGradient id="fillVerif" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-total)"
              stopOpacity={0.7}
            />
            <stop
              offset="95%"
              stopColor="var(--color-total)"
              stopOpacity={0.08}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          fontSize={11}
        />
        <YAxis
          yAxisId="vol"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={28}
          fontSize={11}
        />
        <YAxis
          yAxisId="rate"
          orientation="right"
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          unit="%"
          width={38}
          fontSize={11}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <ReferenceLine
          yAxisId="rate"
          y={95}
          stroke="var(--color-chart-3)"
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
        />
        <Area
          yAxisId="vol"
          type="natural"
          dataKey="total"
          name="total"
          stroke="var(--color-total)"
          strokeWidth={2}
          fill="url(#fillVerif)"
        />
        <Line
          yAxisId="vol"
          type="monotone"
          dataKey="prevTotal"
          name="prevTotal"
          stroke="var(--color-prevTotal)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="rate"
          name="rate"
          stroke="var(--color-rate)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ChartContainer>
  );
}

const COMP_COLOR: Record<string, string> = {
  valid: "bg-success",
  expiring: "bg-warning",
  lapsed: "bg-secondary",
  undated: "bg-outline",
  archived: "bg-on-surface-variant",
};

/**
 * 100%-stacked composition of the registry by credential state. One glance:
 * how much of the registry is valid vs. expiring vs. lapsed vs. unverifiable.
 */
export function LicenseStatusBar({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <EmptyChart message="No credential records yet." />;
  }
  const pct = (v: number) => Math.round((v / total) * 100);
  return (
    <div className="py-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container">
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <div
              key={d.key}
              className={COMP_COLOR[d.key] ?? "bg-outline"}
              style={{ width: `${(d.value / total) * 100}%` }}
              title={`${d.label}: ${d.value} (${pct(d.value)}%)`}
            />
          ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-y-2 text-xs sm:grid-cols-3">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                COMP_COLOR[d.key] ?? "bg-outline",
              )}
              aria-hidden
            />
            <span className="truncate text-on-surface-variant">{d.label}</span>
            <span className="tabular ml-auto font-medium text-on-surface">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Records per batch — chronological (data pre-sorted by batch number). */
export function BatchChart({ data }: { data: BatchPoint[] }) {
  const c = C;
  if (data.length === 0) {
    return <EmptyChart message="No batch data yet." />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis
          dataKey="batch"
          stroke={c.axis}
          fontSize={10}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis
          stroke={c.axis}
          fontSize={11}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={c.tooltip} cursor={{ fill: c.barCursor }} />
        <Bar
          dataKey="count"
          name="Records"
          fill={c.barFill}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
