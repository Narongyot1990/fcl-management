"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate authentication for demonstration
    // In real app, we would call /api/login
    setTimeout(async () => {
      if (username === "administrator@fls.com" && password === "itl@1234") {
        const userSession = {
          username: "administrator@fls.com",
          name: "ITL Administrator",
          role: "admin",
          isLoggedIn: true
        };
        sessionStorage.setItem("itl_user", JSON.stringify(userSession));
        router.push("/");
      } else if (username === "leader_bkk" && password === "1234") {
        // Mock leader for testing
        const userSession = {
          username: "leader_bkk",
          name: "Leader Bangkok",
          role: "leader",
          branch: "Bangkok",
          isLoggedIn: true
        };
        sessionStorage.setItem("itl_user", JSON.stringify(userSession));
        router.push("/");
      } else {
        setError("Invalid username or password");
        setLoading(false);
      }
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">ITL Management</h1>
          <p className="text-slate-400 text-sm font-medium">Please sign in to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-2xl flex items-center gap-3">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Username</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold outline-none transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-3 text-lg"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : "Sign In"}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
            Internal Logistics Support System v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
