// ── Thai date formatter ────────────────────────────────────────────────────────
export const toThaiDate = (iso: string | undefined) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

// ── Short date formatter (dd/MM) ─────────────────────────────────────────────
export const toShortDate = (iso: string | undefined) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
};

// ── Short datetime formatter (dd/MM hh:mm) ─────────────────────────────────
export const toShortDateTime = (iso: string | undefined) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

// ── Date navigation helpers ──────────────────────────────────────────────────
export const formatDateForInput = (date: Date): string => date.toISOString().split("T")[0];

export const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr || new Date().toISOString().split("T")[0]);
  d.setDate(d.getDate() + days);
  return formatDateForInput(d);
};

export const isToday = (dateStr: string): boolean => {
  const today = new Date().toISOString().split("T")[0];
  return dateStr === today;
};
