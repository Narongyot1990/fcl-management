"use client";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/lib/auth/context";

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  useEffect(() => {
    // Middleware normally redirects first; this covers client-side nav races.
    if (!loading && !user && typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 md:pt-8 overflow-auto">{children}</main>
    </div>
  );
}

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
