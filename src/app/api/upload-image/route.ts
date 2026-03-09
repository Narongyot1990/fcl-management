import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

    // Store is configured as private — must use private access
    const blob = await put(`itl-files/${filename}`, file, { access: "private" });

    // Return a proxy URL so images are accessible on all devices via our API
    // The proxy route /api/image/[filename] will fetch from blob store with token
    const proxyUrl = `/api/image/${encodeURIComponent(filename)}`;

    return NextResponse.json({ url: proxyUrl, blobUrl: blob.url, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
