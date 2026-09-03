"use client";
import React, { useRef, useState } from "react";
import { X, Image as ImageIcon, Loader2, Crop, Clipboard, ArrowUpRight } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function uploadBlob(blob: Blob, filename: string) {
    setError("");
    setUploading(true);
    try {
      const options = { maxSizeMB: 2, maxWidthOrHeight: 2560, useWebWorker: true, fileType: "image/jpeg" };
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

  function processFile(file: File) {
    setPendingFile(file);
    setError("");
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setCropSrc(reader.result as string);
        } else {
          uploadFileDirectly(file);
        }
      };
      reader.onerror = () => uploadFileDirectly(file);
      reader.readAsDataURL(file);
    } catch {
      uploadFileDirectly(file);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    processFile(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1. Check standard dataTransfer.files
    let file = e.dataTransfer.files?.[0];

    // 2. Fallback: check dataTransfer.items (useful for LINE PC and certain apps)
    if (!file && e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const itemFile = item.getAsFile();
          if (itemFile) {
            file = itemFile;
            break;
          }
        }
      }
    }

    if (file) {
      processFile(file);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        e.stopPropagation();
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          return;
        }
      }
    }
  }

  async function handleClipboardPasteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setError("");
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setError("Please click this box and press Ctrl + V");
        setTimeout(() => setError(""), 3500);
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          const file = new File([blob], `${type}_paste_${Date.now()}.${ext}`, { type: imageType });
          processFile(file);
          return;
        }
      }
      setError("No image found in clipboard (Copy image in LINE first)");
      setTimeout(() => setError(""), 3500);
    } catch {
      setError("Please click this box and press Ctrl + V");
      setTimeout(() => setError(""), 3500);
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
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">{label}</span>
          <button
            type="button"
            onClick={handleClipboardPasteClick}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
            title="Paste image copied from LINE, Snipping Tool, or clipboard (Ctrl+V)"
          >
            <Clipboard size={10} />
            <span>Paste (Ctrl+V)</span>
          </button>
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />

        {value ? (
          <div
            ref={containerRef}
            tabIndex={0}
            onPaste={handlePaste}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`relative group w-full rounded-xl overflow-hidden border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              isDragOver ? "border-blue-500 ring-4 ring-blue-100 scale-[1.01]" : "border-slate-200 bg-slate-50"
            }`}
          >
            <img src={value} alt={label} className="w-full h-32 object-cover" />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-semibold hover:bg-white transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Choose new file from device"
              >
                <Crop size={12} /> Change
              </button>
              <button
                type="button"
                onClick={handleClipboardPasteClick}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600/95 text-white text-xs font-semibold hover:bg-blue-600 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Paste image from clipboard"
              >
                <Clipboard size={12} /> Paste
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="p-1.5 rounded-lg bg-red-500/95 text-white hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
                title="Remove photo"
              >
                <X size={14} />
              </button>
            </div>

            {uploading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center gap-2">
                <Loader2 size={18} className="text-blue-500 animate-spin" />
                <span className="text-[11px] text-blue-600 font-semibold">Uploading…</span>
              </div>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            tabIndex={0}
            onClick={() => !uploading && inputRef.current?.click()}
            onPaste={handlePaste}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`group w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isDragOver
                ? "border-blue-500 bg-blue-50/80 ring-4 ring-blue-100 scale-[1.01]"
                : uploading
                ? "border-blue-300 bg-blue-50 cursor-wait"
                : "border-slate-200 bg-slate-50/75 hover:border-blue-400 hover:bg-blue-50/40"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="text-blue-500 animate-spin" />
                <span className="text-[11px] text-blue-500 font-semibold">Uploading…</span>
              </>
            ) : isDragOver ? (
              <>
                <ArrowUpRight size={22} className="text-blue-600 animate-bounce" />
                <span className="text-xs text-blue-700 font-semibold">Drop image to upload</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors">
                    <ImageIcon size={16} />
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors">
                    <Clipboard size={16} />
                  </div>
                </div>
                <div className="text-center px-2">
                  <p className="text-xs font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">
                    Click, Drag file, or <span className="text-blue-600 underline decoration-blue-300 underline-offset-2">Paste (Ctrl+V)</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Copy from LINE / Screenshot & Paste here
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {error && <p className="text-[11px] text-red-500 font-medium mt-0.5 px-0.5">{error}</p>}
      </div>
    </>
  );
}
