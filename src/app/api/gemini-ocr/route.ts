import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PROMPT = `You are a highly accurate OCR system for shipping container documents.

You will receive TWO images:
1. Container image (door photo showing ISO code and tare weight)
2. EIR image (document with container number and seal number)

Your task: Extract ALL the following fields from BOTH images:

From CONTAINER image (container door):
1. container_size_code — the ISO size code (format: 2 digits + 1 letter + 1 digit, e.g. 45G1, 22G1, 20G1, 42G1)
2. tare_weight — the tare weight in kg (format: 3-4 digits, e.g. 3700, 3800, 2200)

From EIR image (document):
3. container_no — the container number (format: 4 uppercase letters + 7 digits, e.g. TCKU1234567)
4. seal_no — the seal number (usually 7-10 digits or alphanumeric, e.g. 1234567 or SL987654)

Rules (STRICTLY FOLLOW):
- Only return values you are HIGHLY CONFIDENT about (95%+ certainty).
- If an image is blurry, unclear, or you are not sure about any digit/letter → return null for that field from that image.
- Do NOT guess. Do NOT infer. Only return what you can clearly read.
- For container_size_code: format is 2 digits + 1 letter + 1 digit (e.g., 45G1, 22G1)
- For tare_weight: 3-4 digit number (e.g., 3700, 3800)
- For container_no: 4 uppercase letters + 7 digits (e.g., TCKU1234567)
- For seal_no: alphanumeric, 7-10 characters (e.g., 1234567)
- Return a valid JSON object only. No explanation, no markdown, no extra text.

Response format (JSON only):
{"container_size_code": "45G1" | null, "tare_weight": "3700" | null, "container_no": "TCKU1234567" | null, "seal_no": "1234567" | null}`;

export async function POST(request: NextRequest) {
  try {
    const { containerImageUrl, eirImageUrl } = await request.json();
    if (!containerImageUrl || !eirImageUrl) {
      return NextResponse.json({ error: "containerImageUrl and eirImageUrl are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Get the base URL for proxy requests
    const baseUrl = request.nextUrl.origin;

    // Convert relative URLs to absolute URLs for proxy
    const containerUrl = containerImageUrl.startsWith("/api/image/") 
      ? `${baseUrl}${containerImageUrl}` 
      : containerImageUrl;
    const eirUrl = eirImageUrl.startsWith("/api/image/")
      ? `${baseUrl}${eirImageUrl}`
      : eirImageUrl;

    // Fetch both images and convert to base64
    const [containerImgRes, eirImgRes] = await Promise.all([
      fetch(containerUrl),
      fetch(eirUrl),
    ]);

    if (!containerImgRes.ok || !eirImgRes.ok) {
      return NextResponse.json({ error: "Failed to fetch images" }, { status: 400 });
    }

    const containerContentType = containerImgRes.headers.get("content-type") || "image/jpeg";
    const eirContentType = eirImgRes.headers.get("content-type") || "image/jpeg";

    const [containerBuffer, eirBuffer] = await Promise.all([
      containerImgRes.arrayBuffer(),
      eirImgRes.arrayBuffer(),
    ]);

    const containerBase64 = Buffer.from(containerBuffer).toString("base64");
    const eirBase64 = Buffer.from(eirBuffer).toString("base64");

    const payload = {
      contents: [
        {
          parts: [
            { text: PROMPT },
            {
              inline_data: {
                mime_type: containerContentType,
                data: containerBase64,
              },
            },
            {
              inline_data: {
                mime_type: eirContentType,
                data: eirBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 1,
        maxOutputTokens: 512,
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({ error: "Gemini API error", detail: errText }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    // Strip markdown fences if present
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: { container_size_code: string | null; tare_weight: string | null; container_no: string | null; seal_no: string | null };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return NextResponse.json({ error: "Could not parse response", raw: rawText }, { status: 422 });
    }

    // Validate container_size_code format: 2 digits + 1 letter + 1 digit (e.g., 45G1, 22G1)
    if (parsed.container_size_code) {
      const valid = /^\d{2}[A-Z]\d$/.test(parsed.container_size_code);
      if (!valid) parsed.container_size_code = null;
    }

    // Validate container_no format: 4 letters + 7 digits
    if (parsed.container_no) {
      const valid = /^[A-Z]{4}\d{7}$/.test(parsed.container_no);
      if (!valid) parsed.container_no = null;
    }

    // Validate tare_weight: 3-4 digit number
    if (parsed.tare_weight) {
      const valid = /^\d{3,4}$/.test(parsed.tare_weight);
      if (!valid) parsed.tare_weight = null;
    }

    return NextResponse.json({
      container_size_code: parsed.container_size_code ?? null,
      tare_weight: parsed.tare_weight ?? null,
      container_no: parsed.container_no ?? null,
      seal_no: parsed.seal_no ?? null,
    });
  } catch (error) {
    console.error("gemini-ocr error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
