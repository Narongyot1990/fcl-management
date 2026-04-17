"use client";
import Sidebar from "@/components/Sidebar";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-4 pt-20 md:p-8 md:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
