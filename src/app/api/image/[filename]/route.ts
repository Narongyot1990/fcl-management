import { type NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Remove .blob extension if present, then strip file extension for prefix search
    const cleanFilename = filename.replace(/\.blob$/, "");
    const baseName = cleanFilename.replace(/\.[^.]+$/, "");
    const prefix = `itl-files/${baseName}`;

    console.log("Image proxy - searching with prefix:", prefix);
    const { blobs } = await list({ prefix, limit: 1 });

    if (blobs.length === 0) {
      console.log("Image not found for prefix:", prefix);
      return new NextResponse("Not found", { status: 404 });
    }

    // Redirect to the actual blob URL (public, CDN-cached)
    const blobUrl = blobs[0].url;
    console.log("Image proxy - redirecting to:", blobUrl.slice(0, 80));
    return NextResponse.redirect(blobUrl, { status: 302 });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
