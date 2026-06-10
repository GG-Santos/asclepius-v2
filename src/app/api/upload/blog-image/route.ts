import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/blob";
import { getSession } from "@/lib/session";

// Inline image upload for the blog rich-text editor. Stores on Vercel Blob
// (content-addressed) and returns the public URL for the editor to insert.
export async function POST(req: Request) {
  const session = await getSession();
  const role = session?.user.role;
  if (!session || (role !== "admin" && role !== "writer")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed." },
      { status: 400 },
    );
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be 8 MB or smaller." },
      { status: 400 },
    );
  }

  const asset = await uploadImage(file, {
    folder: "blog",
    uploadedBy: session.user.id,
  });
  return NextResponse.json({ url: asset.url });
}
