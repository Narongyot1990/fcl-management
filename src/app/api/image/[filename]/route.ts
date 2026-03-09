import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Construct the private blob URL
    const blobUrl = `https://itl-files.vercel.app/${filename}`;
    
    // Get signed URL for the private blob
    const blob = await head(blobUrl);
    
    // Fetch the image content
    const imageResponse = await fetch(blob.url);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": imageResponse.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
