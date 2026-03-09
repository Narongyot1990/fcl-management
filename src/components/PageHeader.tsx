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
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={15} />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
