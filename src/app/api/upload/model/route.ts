import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Token endpoint for client-direct uploads of large 3D assets (GLB/poster) to
// Vercel Blob — bypasses the server-action body-size limit. Admin only.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (session?.user.role !== "admin") {
          throw new Error("Only admins can upload 3D models.");
        }
        return {
          allowedContentTypes: [
            "model/gltf-binary",
            "application/octet-stream",
            "image/png",
            "image/webp",
            "image/jpeg",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      // Persisting the Model3D row is done by the server action after upload.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
