"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

/**
 * Axis-less inline trend. Color inherits from the parent's text color via
 * currentColor, so the caller tints it by tone. Renders nothing for < 2 points.
 */
export function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart
        data={points}
        margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
      >
        <Area
          type="monotone"
          dataKey="v"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="currentColor"
          fillOpacity={0.12}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
