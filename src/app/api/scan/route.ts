import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

// Submit a file to VirusTotal for analysis. Returns the analysis id, which the
// client polls via /api/scan/[id]. The API key stays server-side.
export async function POST(request: NextRequest) {
  await requireUser();

  const key = process.env.VIRUS_TOTAL_KEY;
  if (!key) {
    // No key configured — signal the client to skip the scan gracefully.
    return NextResponse.json({ skipped: true });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const vtForm = new FormData();
  vtForm.append("file", file, "upload.png");

  const res = await fetch("https://www.virustotal.com/api/v3/files", {
    method: "POST",
    headers: { "x-apikey": key },
    body: vtForm,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `VirusTotal upload failed (${res.status})` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { data?: { id?: string } };
  const analysisId = data.data?.id;
  if (!analysisId) {
    return NextResponse.json({ error: "No analysis id" }, { status: 502 });
  }
  return NextResponse.json({ analysisId });
}
