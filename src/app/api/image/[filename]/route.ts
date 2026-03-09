import { type NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const cleanFilename = decodeURIComponent(filename).replace(/\.blob$/, "");

    // Try multiple search strategies for the blob
    const prefixes = [
      `itl-files/${cleanFilename}`,                          // exact: itl-files/eir_123.jpg
      `itl-files/${cleanFilename.replace(/\.[^.]+$/, "")}`,  // no ext: itl-files/eir_123
    ];

    for (const prefix of prefixes) {
      const { blobs } = await list({ prefix, limit: 1 });
      if (blobs.length > 0) {
        // Redirect to the actual public blob URL with cache headers
        return new NextResponse(null, {
          status: 302,
          headers: {
            Location: blobs[0].url,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    return new NextResponse("Not found", { status: 404 });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
