import { type NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

// Content-type map for common image extensions
const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
};

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

    // For private stores: fetch the blob content server-side using the token
    // The BLOB_READ_WRITE_TOKEN is automatically used by @vercel/blob for list()
    // but for downloading we need to fetch the downloadUrl with the token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const fetchUrl = token ? `${blobUrl}?token=${token}` : blobUrl;

    const blobRes = await fetch(fetchUrl);
    if (!blobRes.ok) {
      console.error("Image proxy fetch failed:", blobRes.status, blobUrl);
      return new NextResponse("Not found", { status: 404 });
    }

    const ext = cleanFilename.split(".").pop()?.toLowerCase() || "jpg";
    const contentType = blobRes.headers.get("content-type") || MIME[ext] || "image/jpeg";

    return new NextResponse(blobRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
