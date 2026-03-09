import { NextRequest, NextResponse } from "next/server";
import { put, head } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log("=== UPLOAD START ===");
  const apiKey = request.headers.get("X-API-Key") ?? "";
  console.log("API Key exists:", !!apiKey);
  console.log("OCR_API_SECRET exists:", !!process.env.OCR_API_SECRET);
  console.log("BLOB_READ_WRITE_TOKEN exists:", !!process.env.BLOB_READ_WRITE_TOKEN);
  
  if (apiKey !== process.env.OCR_API_SECRET) {
    console.log("❌ Auth failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "eir" or "container"

    console.log("File:", file?.name, file?.size, file?.type);
    console.log("Type:", type);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique filename: type_bookingId_timestamp.extension
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${type || "file"}_${timestamp}.${extension}`;
    console.log("Filename:", filename);

    const blob = await put(filename, file, {
      access: "private",
    });
    console.log("✅ Blob uploaded:", blob.url);

    // For private blobs, the URL from put() is already a signed URL
    console.log("✅ Signed URL:", blob.url);

    return NextResponse.json({ url: blob.url, filename });
  } catch (error) {
    console.error("❌ Blob upload error:", error);
    console.error("Error details:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Upload failed", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}
