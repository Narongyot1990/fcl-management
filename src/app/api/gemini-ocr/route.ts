import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PROMPT = `You are a highly accurate OCR system for shipping container documents (EIR / Gate Pass).

Your task: Extract ONLY the following fields from the image:
1. container_no — the container number (format: 4 uppercase letters + 7 digits, e.g. TCKU1234567)
2. seal_no — the seal number (usually 7-10 digits or alphanumeric, e.g. 1234567 or SL987654)

Rules (STRICTLY FOLLOW):
- Only return values you are HIGHLY CONFIDENT about (95%+ certainty).
- If the image is blurry, unclear, or you are not sure about any digit/letter → return null for that field.
- Do NOT guess. Do NOT infer. Only return what you can clearly read.
- Container number MUST match the standard format: 4 uppercase letters + 7 digits (last digit is a check digit).
- Seal number: return only if clearly visible and unambiguous.
- Return a valid JSON object only. No explanation, no markdown, no extra text.

Response format (JSON only):
{"container_no": "ABCD1234567" | null, "seal_no": "1234567" | null}`;

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

    let parsed: { container_no: string | null; seal_no: string | null };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return NextResponse.json({ error: "Could not parse response", raw: rawText }, { status: 422 });
    }

    // Validate container_no format: 4 letters + 7 digits
    if (parsed.container_no) {
      const valid = /^[A-Z]{4}\d{7}$/.test(parsed.container_no);
      if (!valid) parsed.container_no = null;
    }

    return NextResponse.json({
      container_no: parsed.container_no ?? null,
      seal_no: parsed.seal_no ?? null,
    });
  } catch (error) {
    console.error("gemini-ocr error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
