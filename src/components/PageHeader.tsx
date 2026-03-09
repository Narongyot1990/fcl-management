"use client";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, onAdd, addLabel = "Add New", children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-[var(--foreground)] truncate">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
