"use client";
import React, { useRef, useState } from "react";
import { UploadCloud, X, Image as ImageIcon, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";

interface Props {
  label: string;
  value: string;        // current URL
  type: "eir" | "container";
  onChange: (url: string) => void;
}

export default function ImageUpload({ label, value, type, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      // Compress the image before uploading
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const fd = new FormData();
      fd.append("file", compressedFile);
      fd.append("type", type);
      const apiKey = typeof window !== "undefined" ? sessionStorage.getItem("eir_api_key") ?? "" : "";
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "X-API-Key": apiKey },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onChange(data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />

      {value ? (
        <div className="relative group w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {/* Preview */}
          <img src={value} alt={label} className="w-full h-36 object-cover" />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 min-h-[38px] rounded-lg bg-white/95 text-slate-800 text-xs font-semibold hover:bg-white transition-colors flex items-center gap-2 shadow-sm"
            >
              <UploadCloud size={14} /> เปลี่ยนรูป
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-red-500/95 text-white hover:bg-red-600 transition-colors shadow-sm"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
            ${uploading ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"}`}
        >
          {uploading ? (
            <>
              <Loader2 size={24} className="text-blue-500 animate-spin" />
              <span className="text-xs text-blue-500 font-medium">กำลังอัปโหลด…</span>
            </>
          ) : (
            <>
              <ImageIcon size={24} className="text-slate-300" />
              <span className="text-xs text-slate-400 text-center leading-snug">
                คลิกหรือลากไฟล์มาวางที่นี่<br />
                <span className="text-[10px] text-slate-300">JPG, PNG, WEBP</span>
              </span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
