"use client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  // Authentication temporarily disabled
  return <>{children}</>;
}
