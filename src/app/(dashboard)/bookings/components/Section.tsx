"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  cols?: number;
  defaultOpen?: boolean;
}

export default function Section({ title, icon, children, cols = 2, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </span>
        {open ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
      </button>
      {open && (
        <div className={`px-3.5 py-3 grid gap-3 grid-cols-1 ${cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
          {children}
        </div>
      )}
    </div>
  );
}