import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PROMPT = `You are a highly accurate OCR system for shipping container door photos.

Your task: Extract ONLY the following fields from the image - these are printed on the container door:
1. container_size_code — the ISO size code (format: 2 digits + 1 letter + 1 digit, e.g. 45G1, 22G1, 20G1, 42G1)
2. tare_weight — the tare weight in kg (format: 3-4 digits, e.g. 3700, 3800, 2200)

Rules (STRICTLY FOLLOW):
- Only return values you are HIGHLY CONFIDENT about (95%+ certainty).
- Look for the ISO code (usually shows container type like 45G1, 40HC, 22G1) and TARE weight (in kg) printed on the container door.
- If the image is blurry, unclear, or you are not sure about any digit/letter → return null for that field.
- Do NOT guess. Do NOT infer. Only return what you can clearly read.
- ISO code format: 2 digits + 1 letter + 1 digit (e.g., 45G1, 22G1, 20G1, 42G1)
- Tare weight: 3-4 digit number followed by KG or just the number (e.g., 3700, 3800)
- Return a valid JSON object only. No explanation, no markdown, no extra text.

Response format (JSON only):
{"container_size_code": "45G1" | null, "tare_weight": "3700" | null}`;

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Fetch the image and convert to base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 400 });
    }
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const payload = {
      contents: [
        {
          parts: [
            { text: PROMPT },
            {
              inline_data: {
                mime_type: contentType,
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 1,
        maxOutputTokens: 256,
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

    let parsed: { container_size_code: string | null; tare_weight: string | null };
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

    // Validate tare_weight: 3-4 digit number
    if (parsed.tare_weight) {
      const valid = /^\d{3,4}$/.test(parsed.tare_weight);
      if (!valid) parsed.tare_weight = null;
    }

    return NextResponse.json({
      container_size_code: parsed.container_size_code ?? null,
      tare_weight: parsed.tare_weight ?? null,
    });
  } catch (error) {
    console.error("gemini-ocr error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
