import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Upload a course asset (cover image or a downloadable resource) to Vercel Blob.
// Admin only. Content-addressed by SHA-256 so identical files store once.
// Returns the public URL plus basic metadata for the dashboard to display.

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
]);

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getSession();
  if (session?.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be 25 MB or smaller." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(buffer).digest("hex");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const pathname = `courses/${contentHash}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return NextResponse.json({
    url: blob.url,
    name: file.name,
    size: buffer.length,
    contentType: file.type,
  });
}
