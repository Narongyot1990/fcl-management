"use client";
import React from "react";
import { 
  User, Phone, Star, TrendingUp, Package, Truck, 
  ShieldCheck, MapPin, Calendar, ExternalLink, 
  Settings, Bell, Award, History, Edit3
} from "lucide-react";
import type { Driver } from "@/lib/types";
import { clsx } from "clsx";

interface DriverProfileProps {
  driver: Driver;
  mode?: "personal" | "visitor";
  onEdit?: () => void;
}

export default function DriverProfile({ driver, mode = "visitor", onEdit }: DriverProfileProps) {
  const isPersonal = mode === "personal";

  return (
    <div className="flex flex-col h-full gap-4 text-slate-800">
      {/* ── Top Row: Header Info ── */}
      <div className="flex gap-4 items-stretch h-32">
        {/* Avatar Card */}
        <div className="flex-none w-32 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center relative group">
          {driver.avatar_url ? (
            <img src={driver.avatar_url} alt={driver.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-50 flex items-center justify-center">
              <User size={48} className="text-slate-300" />
            </div>
          )}
          <div className={clsx(
            "absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white",
            driver.status === "active" ? "bg-emerald-500" : 
            driver.status === "on_job" ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" : 
            "bg-slate-300"
          )} title={driver.status} />
        </div>

        {/* Identity Card */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Truck size={80} strokeWidth={1} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight text-slate-900">{driver.name}</h2>
              {isPersonal && (
                <button onClick={onEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                  <Edit3 size={18} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-1">
                <Phone size={14} className="text-blue-500" />
                {driver.phone}
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-500" />
                Verified
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-auto pt-3 border-t border-slate-50/50">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</span>
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" 
                  style={{ width: `${driver.score || 0}%` }}
                />
              </div>
              <span className="text-xs font-black text-indigo-700">{driver.score || 0}%</span>
            </div>
          </div>
        </div>

        {/* Action/Menu Card */}
        <div className="flex-none w-16 flex flex-col gap-2">
          {isPersonal ? (
            <>
              <button className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                <Bell size={20} />
              </button>
              <button className="flex-1 bg-indigo-600 rounded-2xl flex items-center justify-center text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                <TrendingUp size={20} />
              </button>
            </>
          ) : (
            <>
              <a href={`tel:${driver.phone}`} className="flex-1 bg-emerald-500 rounded-2xl flex items-center justify-center text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100">
                <Phone size={20} />
              </a>
              <button className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                <ExternalLink size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Middle Row: Performance Stats (Bento Grid) ── */}
      <div className="grid grid-cols-4 gap-4 flex-1 min-h-0">
        {/* Rating Card */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-5 text-white shadow-lg shadow-orange-100 flex flex-col justify-between">
          <Star size={24} fill="currentColor" />
          <div>
            <p className="text-4xl font-black">{driver.rating || "5.0"}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Overall Rating</p>
          </div>
        </div>

        {/* Jobs Card */}
        <div className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col justify-between">
          <Package size={24} className="text-indigo-400" />
          <div>
            <p className="text-4xl font-black">{driver.jobs_count || 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Jobs Completed</p>
          </div>
        </div>

        {/* Real-time Map/Status Card */}
        <div className="col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            {/* Placeholder for small map or pattern */}
            <div className="w-full h-full bg-[radial-gradient(circle,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
          </div>
          <div className="flex items-center justify-between z-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} className="text-blue-500" /> Current Status
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">LIVE API</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1 z-10 pt-2">
            <p className="text-lg font-bold text-slate-800">
              {driver.status === "on_job" ? "Currently en route to Port" : "Available for assignment"}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={12} /> Joined {driver.joined_at || "May 2024"}
            </p>
          </div>
          {/* Progress bar if on job */}
          {driver.status === "on_job" && (
             <div className="mt-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-2/3" />
             </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Details & Footer ── */}
      <div className="flex gap-4 min-h-[140px]">
         {/* Badges/Awards */}
         <div className="w-1/3 bg-slate-50 rounded-3xl p-4 border border-slate-200/50 flex flex-col gap-3">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Achievements</h4>
            <div className="flex flex-wrap gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600" title="Safest Driver">
                <Award size={20} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600" title="Top 10%">
                <Star size={20} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600" title="Punctuality">
                <Calendar size={20} />
              </div>
            </div>
         </div>

         {/* History Timeline (High Density) */}
         <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center justify-between">
              Recent Activity
              <History size={12} />
            </h4>
            <div className="flex flex-col gap-2.5 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="text-slate-500 w-16">2h ago</span>
                  <span className="font-bold text-slate-700 flex-1 truncate">Completed Cargo Pickup (BK-0092)</span>
                  <span className="text-emerald-600 font-mono">+12pt</span>
                </div>
              ))}
            </div>
         </div>
      </div>
    </div>
  );
}
