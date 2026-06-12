import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/blob";
import { canAuthorPosts } from "@/lib/blog-permission";
import { getSession } from "@/lib/session";

// Inline image upload for the blog rich-text editor. Stores on Vercel Blob
// (content-addressed) and returns the public URL for the editor to insert.
// Editors only: admins, or graduates with admin-granted canBlog.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !(await canAuthorPosts(session))) {
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
