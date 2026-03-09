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

interface ImageData {
  base64: string;
  contentType: string;
}

export async function POST(request: NextRequest) {
  try {
    // Client sends base64-encoded images directly (no server-side blob resolution needed)
    const { containerImage, eirImage } = await request.json() as {
      containerImage: ImageData;
      eirImage: ImageData;
    };

    if (!containerImage?.base64 || !eirImage?.base64) {
      return NextResponse.json({ error: "containerImage and eirImage with base64 data are required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    // Map user-friendly names to actual API model names (from ListModels API)
    const MODEL_MAP: Record<string, string> = {
      "gemini-3-flash":     "gemini-3-flash-preview",
      "gemini-3.0-flash":   "gemini-3-flash-preview",
      "gemini-2-flash":     "gemini-2.0-flash",
      "gemini-2.0-flash":   "gemini-2.0-flash",
      "gemini-2.5-flash":   "gemini-2.5-flash",
      "gemini-2.5-pro":     "gemini-2.5-pro",
    };
    const userModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
    const model = MODEL_MAP[userModel] || userModel;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    console.log("[gemini-ocr] Received base64 images. Container:", containerImage.contentType, "EIR:", eirImage.contentType);

    const payload = {
      contents: [
        {
          parts: [
            { text: PROMPT },
            { text: "Image 1 - CONTAINER door photo:" },
            {
              inline_data: {
                mime_type: containerImage.contentType,
                data: containerImage.base64,
              },
            },
            { text: "Image 2 - EIR document:" },
            {
              inline_data: {
                mime_type: eirImage.contentType,
                data: eirImage.base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log("[gemini-ocr] Calling Gemini:", model);

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[gemini-ocr] Gemini API error:", errText);
      return NextResponse.json({ error: "Gemini API error", detail: errText }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    // Thinking models return multiple parts: thought parts + text part
    // Find the last non-thought text part which contains the actual answer
    const parts = geminiData?.candidates?.[0]?.content?.parts ?? [];
    const textParts = parts.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought);
    const rawText = (textParts.length > 0 ? textParts[textParts.length - 1].text : parts[parts.length - 1]?.text ?? "").trim();
    console.log("[gemini-ocr] Parts count:", parts.length, "Text parts:", textParts.length);
    console.log("[gemini-ocr] Raw response:", rawText);

    // Strip markdown fences if present
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: { container_size_code: string | null; tare_weight: string | null; container_no: string | null; seal_no: string | null };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[gemini-ocr] Failed to parse:", rawText);
      return NextResponse.json({ error: "Could not parse response", raw: rawText }, { status: 422 });
    }

    // Validate container_size_code format: 2 digits + 1 letter + 1 digit
    if (parsed.container_size_code) {
      if (!/^\d{2}[A-Z]\d$/.test(parsed.container_size_code)) parsed.container_size_code = null;
    }

    // Validate container_no format: 4 letters + 7 digits
    if (parsed.container_no) {
      if (!/^[A-Z]{4}\d{7}$/.test(parsed.container_no)) parsed.container_no = null;
    }

    // Validate tare_weight: 3-5 digit number
    if (parsed.tare_weight) {
      if (!/^\d{3,5}$/.test(parsed.tare_weight)) parsed.tare_weight = null;
    }

    console.log("[gemini-ocr] Result:", parsed);

    return NextResponse.json({
      container_size_code: parsed.container_size_code ?? null,
      tare_weight: parsed.tare_weight ?? null,
      container_no: parsed.container_no ?? null,
      seal_no: parsed.seal_no ?? null,
    });
  } catch (error) {
    console.error("[gemini-ocr] Error:", error);
    return NextResponse.json({
      error: "Internal error",
      detail: error instanceof Error ? error.message : "Unknown",
    }, { status: 500 });
  }
}
