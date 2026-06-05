import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

// Poll a VirusTotal analysis. Returns status ("queued" | "in-progress" |
// "completed") and whether anything flagged the file as malicious/suspicious.
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const key = process.env.VIRUS_TOTAL_KEY;
  if (!key) return NextResponse.json({ status: "completed", malicious: 0 });

  const { id } = await ctx.params;
  const res = await fetch(
    `https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(id)}`,
    { headers: { "x-apikey": key }, cache: "no-store" },
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `VirusTotal poll failed (${res.status})` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    data?: {
      attributes?: {
        status?: string;
        stats?: { malicious?: number; suspicious?: number };
      };
    };
  };
  const attrs = data.data?.attributes;
  const stats = attrs?.stats ?? {};
  return NextResponse.json({
    status: attrs?.status ?? "queued",
    malicious: (stats.malicious ?? 0) + (stats.suspicious ?? 0),
  });
}
