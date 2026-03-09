"use client";
import { useState, useEffect } from "react";
import { KeyRound } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("eir_api_key");
    if (stored) {
      setKey(stored);
      setSaved(true);
    }
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem("eir_api_key", input.trim());
    setKey(input.trim());
    setSaved(true);
  }

  if (!saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 border border-[var(--border)]">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <KeyRound className="text-blue-600" size={22} />
            </div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">EIR Control System</h1>
            <p className="text-sm text-[var(--muted)] text-center">Enter your API key to continue</p>
          </div>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="X-API-Key"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <button
        onClick={() => {
          sessionStorage.removeItem("eir_api_key");
          setKey("");
          setSaved(false);
          setInput("");
        }}
        className="fixed bottom-4 right-4 text-xs text-[var(--muted)] hover:text-red-500 transition-colors bg-white border border-[var(--border)] px-3 py-1.5 rounded-full shadow-sm"
      >
        Sign out
      </button>
    </>
  );
}
