"use client";
import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface OcrResult {
  container_no: string | null;
  seal_no: string | null;
}

interface Props {
  imageUrl: string;
  imageLabel: string;
  onResult: (result: OcrResult) => void;
}

type Status = "idle" | "loading" | "success" | "error" | "low_confidence";

export default function GeminiOcrButton({ imageUrl, imageLabel, onResult }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleScan() {
    if (!imageUrl || status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/gemini-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }

      const data: OcrResult = await res.json();

      if (!data.container_no && !data.seal_no) {
        setStatus("low_confidence");
        setMessage("ภาพไม่ชัดพอ หรือ Gemini ไม่มั่นใจ — กรุณากรอกเอง");
        return;
      }

      onResult(data);

      const filled: string[] = [];
      if (data.container_no) filled.push(`Container: ${data.container_no}`);
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
        disabled={!imageUrl || status === "loading"}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border shadow-sm
          ${!imageUrl
            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
            : status === "loading"
            ? "bg-violet-50 text-violet-400 border-violet-100 cursor-wait"
            : status === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : status === "low_confidence" || status === "error"
            ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
            : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300"
          }`}
        title={!imageUrl ? `อัปโหลด${imageLabel}ก่อน` : `สแกน${imageLabel}ด้วย Gemini AI`}
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
            : `สแกน ${imageLabel} (AI)`}
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
