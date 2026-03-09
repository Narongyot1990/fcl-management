import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Authentication temporarily disabled
  // const apiKey = request.headers.get("X-API-Key") ?? "";
  // if (apiKey !== process.env.OCR_API_SECRET) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `${type || "file"}_${timestamp}.${extension}`;

    const blob = await put(`itl-files/${filename}`, file, { access: "public" });

    // Return the blob URL directly - can be used by both client and server
    return NextResponse.json({ url: blob.url, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
