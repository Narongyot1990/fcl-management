import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";

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

/** JSON schema handed to Gemini so it returns clean, parseable output. */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    container_size_code: { type: "STRING", nullable: true },
    tare_weight: { type: "STRING", nullable: true },
    container_no: { type: "STRING", nullable: true },
    seal_no: { type: "STRING", nullable: true },
  },
  required: ["container_size_code", "tare_weight", "container_no", "seal_no"],
};

/** Gemini 2.5 / 3 are thinking models; older flash models reject thinkingConfig. */
function supportsThinkingConfig(model: string): boolean {
  return /gemini-(2\.5|3)/.test(model);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "ocr:use");
    if (!auth.ok) return auth.response;

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

    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      // Gemini 3 Flash always "thinks"; real container photos can burn well over
      // 2000 thinking tokens before any answer text, so keep plenty of headroom.
      maxOutputTokens: 8192,
      // Force a clean JSON object back (no ```json fences, no prose).
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    };
    if (supportsThinkingConfig(model)) {
      // This is deterministic field extraction — no reasoning needed. Disabling
      // thinking removes the token-budget blowout that caused MAX_TOKENS
      // truncation and "Could not parse response".
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

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
      generationConfig,
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
    const candidate = geminiData?.candidates?.[0];
    const finishReason: string | undefined = candidate?.finishReason;
    // Thinking models return multiple parts (thought parts + answer). Join every
    // non-thought text part so a split answer is not lost.
    const parts: { text?: string; thought?: boolean }[] = candidate?.content?.parts ?? [];
    const rawText = parts
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text as string)
      .join("")
      .trim();
    console.log(
      "[gemini-ocr] finishReason:", finishReason,
      "| parts:", parts.length,
      "| usage:", JSON.stringify(geminiData?.usageMetadata ?? {})
    );
    console.log("[gemini-ocr] Raw response:", rawText);

    if (!rawText) {
      const reason =
        finishReason === "MAX_TOKENS"
          ? "Model hit the output token limit before returning an answer (raise maxOutputTokens or lower thinking budget)."
          : finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT"
          ? "Gemini blocked the response for safety reasons."
          : `Gemini returned no text (finishReason: ${finishReason ?? "unknown"}).`;
      console.error("[gemini-ocr] Empty response.", reason);
      return NextResponse.json({ error: reason, finishReason }, { status: 502 });
    }

    // responseMimeType=application/json should already give clean JSON; strip
    // fences defensively in case the config is ever changed.
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: { container_size_code: string | null; tare_weight: string | null; container_no: string | null; seal_no: string | null };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[gemini-ocr] Failed to parse:", rawText, "| finishReason:", finishReason);
      return NextResponse.json(
        { error: "Could not parse response", raw: rawText, finishReason },
        { status: 422 }
      );
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
