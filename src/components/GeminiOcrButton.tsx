"use client";
import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface OcrResult {
  container_size_code: string | null;
  tare_weight: string | null;
  container_no: string | null;
  seal_no: string | null;
}

interface Props {
  containerImageUrl: string;
  eirImageUrl: string;
  onResult: (result: OcrResult) => void;
}

type Status = "idle" | "loading" | "success" | "error" | "low_confidence";

/** Fetch an image URL in the browser and return { base64, contentType } */
async function imageToBase64(url: string): Promise<{ base64: string; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load image: ${res.status}`);
  const blob = await res.blob();
  const contentType = blob.type || "image/jpeg";
  const buffer = await blob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
  return { base64, contentType };
}

export default function GeminiOcrButton({ containerImageUrl, eirImageUrl, onResult }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleScan() {
    if (!containerImageUrl || !eirImageUrl || status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      // Fetch both images client-side and convert to base64
      // This works for all URL types (proxy, direct blob, external)
      const [containerImg, eirImg] = await Promise.all([
        imageToBase64(containerImageUrl),
        imageToBase64(eirImageUrl),
      ]);

      const res = await fetch("/api/gemini-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containerImage: containerImg,
          eirImage: eirImg,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }

      const data: OcrResult = await res.json();

      // Check if at least some data was extracted
      const hasData = data.container_size_code || data.tare_weight || data.container_no || data.seal_no;
      if (!hasData) {
        setStatus("low_confidence");
        setMessage("ภาพไม่ชัดพอ หรือ Gemini ไม่มั่นใจ — กรุณากรอกเอง");
        return;
      }

      onResult(data);

      const filled: string[] = [];
      if (data.container_size_code) filled.push(`Code: ${data.container_size_code}`);
      if (data.tare_weight) filled.push(`Tare: ${data.tare_weight}kg`);
      if (data.container_no) filled.push(`No: ${data.container_no}`);
      if (data.seal_no) filled.push(`Seal: ${data.seal_no}`);
      setStatus("success");
      setMessage(filled.join("  |  "));

      // Reset after 4s
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 4000);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 4000);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleScan}
        disabled={!containerImageUrl || !eirImageUrl || status === "loading"}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border shadow-sm
          ${!containerImageUrl || !eirImageUrl
            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
            : status === "loading"
            ? "bg-violet-50 text-violet-400 border-violet-100 cursor-wait"
            : status === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : status === "low_confidence" || status === "error"
            ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
            : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300"
          }`}
        title={!containerImageUrl || !eirImageUrl ? "อัปโหลดรูป Container และ EIR ก่อน" : "สแกนทั้ง 2 รูปด้วย Gemini AI"}
      >
        {status === "loading" ? (
          <Loader2 size={13} className="animate-spin shrink-0" />
        ) : status === "success" ? (
          <CheckCircle2 size={13} className="shrink-0" />
        ) : status === "low_confidence" || status === "error" ? (
          <AlertCircle size={13} className="shrink-0" />
        ) : (
          <Sparkles size={13} className="shrink-0" />
        )}
        <span>
          {status === "loading"
            ? "กำลังสแกน…"
            : status === "success"
            ? "สแกนสำเร็จ"
            : status === "low_confidence"
            ? "ความมั่นใจต่ำ"
            : status === "error"
            ? "สแกนล้มเหลว"
            : "สแกนทั้ง 2 รูป (AI)"}
        </span>
      </button>

      {message && (
        <p className={`text-[11px] font-medium px-1 leading-snug
          ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
