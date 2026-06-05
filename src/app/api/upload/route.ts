import { type NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/blob";
import { requireUser } from "@/lib/session";

// Authenticated image upload (staff or graduate updating their own photo). The
// browser POSTs the cropped file here (XHR for progress); we push it to Vercel
// Blob, record the MediaAsset (url + SHA-256 hash, deduped), and return id+url.
// Linking the asset to a record is gated separately.
export async function POST(request: NextRequest) {
  const session = await requireUser();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 5MB" }, { status: 400 });
  }

  const asset = await uploadImage(file, {
    folder: "graduates",
    uploadedBy: session.user.id,
  });
  return NextResponse.json({ id: asset.id, url: asset.url });
}
