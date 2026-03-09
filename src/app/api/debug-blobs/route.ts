import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "itl-files/", limit: 50 });
    return NextResponse.json(
      blobs.map((b) => ({ pathname: b.pathname, url: b.url.slice(0, 100), size: b.size }))
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
