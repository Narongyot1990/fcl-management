import { type NextRequest, NextResponse } from "next/server";
import { list, get } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const cleanFilename = decodeURIComponent(filename).replace(/\.blob$/, "");

    // Try multiple prefix strategies to find the blob
    const prefixes = [
      `itl-files/${cleanFilename}`,
      `itl-files/${cleanFilename.replace(/\.[^.]+$/, "")}`,
    ];

    let blobUrl: string | null = null;
    for (const prefix of prefixes) {
      const { blobs } = await list({ prefix, limit: 1 });
      if (blobs.length > 0) {
        blobUrl = blobs[0].url;
        break;
      }
    }

    if (!blobUrl) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Use official SDK get() for private store — handles auth automatically
    const result = await get(blobUrl, { access: "private" });

    if (result?.statusCode !== 200) {
      console.error("Image proxy get failed:", result?.statusCode, blobUrl);
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.blob.contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
