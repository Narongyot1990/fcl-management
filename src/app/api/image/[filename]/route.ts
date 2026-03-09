import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Remove .blob extension if present
    const cleanFilename = filename.replace(/\.blob$/, "");
    
    console.log("Image proxy - looking for:", `itl-files/${cleanFilename}`);
    const result = await get(`itl-files/${cleanFilename}`, { access: "public" });

    if (!result || result.statusCode !== 200) {
      console.log("Image not found:", result);
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
