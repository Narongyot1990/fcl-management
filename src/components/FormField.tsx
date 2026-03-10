"use client";

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  hintType?: "default" | "error" | "success";
}

export function FormField({ label, required, children, hint, hintType }: FormFieldProps) {
  const hintColor =
    hintType === "error" ? "text-red-500 font-medium" :
    hintType === "success" ? "text-emerald-600 font-medium" :
    "text-[var(--muted)]";
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className={`text-xs ${hintColor}`}>{hint}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full px-2.5 py-1.5 min-h-[32px] rounded-lg border border-[var(--border)] shadow-sm hover:shadow text-xs bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200 ${className ?? ""}`}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ options, placeholder, className, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-2.5 py-1.5 min-h-[32px] rounded-lg border border-[var(--border)] shadow-sm hover:shadow text-xs bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200 ${className ?? ""}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 3}
      className={`w-full px-2.5 py-1.5 min-h-[32px] rounded-lg border border-[var(--border)] shadow-sm hover:shadow text-xs bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400 transition-all duration-200 ${className ?? ""}`}
    />
  );
}
