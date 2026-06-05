"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BatchPoint, LookupPoint } from "@/lib/analytics";

const AXIS = "#747782";
const GRID = "#e0e3e5";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #c4c6d2",
  fontSize: 12,
  background: "#ffffff",
};

export function LookupsChart({ data }: { data: LookupPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
      >
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={AXIS}
          fontSize={11}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke={AXIS}
          fontSize={11}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="found"
          name="Verified"
          stroke="#3d5ca2"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="notFound"
          name="Not found"
          stroke="#ba002a"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BatchChart({ data }: { data: BatchPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="batch"
          stroke={AXIS}
          fontSize={10}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={50}
        />
        <YAxis
          stroke={AXIS}
          fontSize={11}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f2f4f6" }} />
        <Bar
          dataKey="count"
          name="Records"
          fill="#001a48"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
