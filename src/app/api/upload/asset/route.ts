import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Token endpoint for client-direct upload of images and videos to Vercel Blob.
// Admin only. Max 100 MB per file.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        const role = session?.user?.role;
        if (role !== "admin") throw new Error("Admin only.");
        return {
          maximumSizeInBytes: 100 * 1024 * 1024,
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/svg+xml",
            "image/avif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-msvideo",
          ],
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
