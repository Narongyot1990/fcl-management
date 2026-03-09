"use client";
import React, { useRef, useState } from "react";
import { UploadCloud, X, Image as ImageIcon, Loader2, Crop } from "lucide-react";
import imageCompression from "browser-image-compression";
import ImageCropModal from "./ImageCropModal";

interface Props {
  label: string;
  value: string;
  type: "eir" | "container";
  onChange: (url: string) => void;
}

export default function ImageUpload({ label, value, type, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function uploadBlob(blob: Blob, filename: string) {
    setError("");
    setUploading(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true };
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      const compressed = await imageCompression(file, options);

      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("type", type);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      onChange(data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function uploadFileDirectly(file: File) {
    await uploadBlob(file, `${type}_${Date.now()}.${file.name.split(".").pop() || "jpg"}`);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingFile(file);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setCropSrc(reader.result as string);
        } else {
          // Fallback: upload directly without crop
          uploadFileDirectly(file);
        }
      };
      reader.onerror = () => {
        // Fallback: upload directly without crop
        uploadFileDirectly(file);
      };
      reader.readAsDataURL(file);
    } catch {
      // Fallback: upload directly without crop
      uploadFileDirectly(file);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setPendingFile(file);
    try {
      const reader = new FileReader();
      reader.onload = () => setCropSrc(reader.result as string);
      reader.onerror = () => uploadFileDirectly(file);
      reader.readAsDataURL(file);
    } catch {
      uploadFileDirectly(file);
    }
  }

  function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    setPendingFile(null);
    uploadBlob(blob, `${type}_${Date.now()}.jpg`);
  }

  function handleCropCancel() {
    setCropSrc(null);
    setPendingFile(null);
  }

  function handleSkipCrop() {
    setCropSrc(null);
    if (pendingFile) {
      uploadFileDirectly(pendingFile);
      setPendingFile(null);
    }
  }

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          onSkip={handleSkipCrop}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />

        {value ? (
          <div className="relative group w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img src={value} alt={label} className="w-full h-32 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-semibold hover:bg-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Crop size={12} /> เปลี่ยน
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="p-1.5 rounded-lg bg-red-500/95 text-white hover:bg-red-600 transition-colors shadow-sm"
              >
                <X size={14} />
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2">
                <Loader2 size={18} className="text-blue-500 animate-spin" />
                <span className="text-[11px] text-blue-600 font-medium">อัปโหลด…</span>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`w-full h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors
              ${uploading ? "border-blue-300 bg-blue-50 cursor-wait" : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"}`}
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="text-blue-500 animate-spin" />
                <span className="text-[11px] text-blue-500 font-medium">อัปโหลด…</span>
              </>
            ) : (
              <>
                <ImageIcon size={20} className="text-slate-300" />
                <span className="text-[11px] text-slate-400 text-center leading-snug">
                  คลิกเพื่อเลือกรูป<br />
                  <span className="text-[10px] text-slate-300">JPG, PNG, WEBP</span>
                </span>
              </>
            )}
          </div>
        )}

        {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
      </div>
    </>
  );
}
