"use client";
import React from "react";
import { formatDateForInput, addDays, isToday } from "@/lib/dateUtils";

interface DateNavigatorProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
}

export default function DateNavigator({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateNavigatorProps) {
  const handlePrev = () => {
    const newDate = addDays(dateFrom, -1);
    onDateFromChange(newDate);
    onDateToChange(newDate);
  };

  const handleToday = () => {
    const today = formatDateForInput(new Date());
    onDateFromChange(today);
    onDateToChange(today);
  };

  const handleNext = () => {
    const newDate = addDays(dateFrom, 1);
    onDateFromChange(newDate);
    onDateToChange(newDate);
  };

  const handleClear = () => {
    onDateFromChange("");
    onDateToChange("");
  };

  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handlePrev}
        className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-slate-50 transition-colors"
      >
        {"<"}
      </button>
      <button
        onClick={handleToday}
        className={`px-3 py-1.5 text-xs border rounded-lg transition-colors font-medium ${
          isToday(dateFrom)
            ? "bg-blue-50 border-blue-300 text-blue-700"
            : "border-[var(--border)] hover:bg-slate-50 text-slate-500"
        }`}
      >
        Today
      </button>
      <button
        onClick={handleNext}
        className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-slate-50 transition-colors"
      >
        {">"}
      </button>
      {hasDateFilter && (
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
