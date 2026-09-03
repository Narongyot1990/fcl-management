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

    // Upload route stores blobs at a deterministic pathname (addRandomSuffix
    // defaults to false in @vercel/blob v2), so resolve by pathname directly.
    // get() is read-after-write consistent; list() is only *eventually*
    // consistent, which used to 404 for a few seconds right after upload — that
    // was the "paste image then Send to AI fails, but works after save+reopen"
    // bug. useCache:false skips the CDN and reads straight from origin storage.
    let result = await get(`itl-files/${cleanFilename}`, {
      access: "private",
      useCache: false,
    }).catch(() => null);

    // Fallback for legacy blobs that were stored with a random suffix.
    if (result?.statusCode !== 200) {
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
      result = await get(blobUrl, { access: "private" });
    }

    if (result?.statusCode !== 200) {
      console.error("Image proxy get failed:", result?.statusCode, cleanFilename);
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
