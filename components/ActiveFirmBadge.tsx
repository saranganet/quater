"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  LogOut,
  ChevronDown,
  Check,
  Loader2,
  Shield,
  ShieldAlert,
  CalendarCheck,
  Settings,
  Users,
} from "lucide-react";

interface ActiveFirmBadgeProps {
  activeFirm: {
    id: string;
    name: string;
    slug: string;
    leadAdvocate?: string | null;
    dispatchMode?: string | null;
  } | null;
  allFirms?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export function ActiveFirmBadge({ activeFirm, allFirms = [] }: ActiveFirmBadgeProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [activeRole, setActiveRole] = useState<"ADMIN" | "JUNIOR">("ADMIN");

  useEffect(() => {
    fetch("/api/auth/firm")
      .then((res) => res.json())
      .then((data) => {
        if (data.activeRole) setActiveRole(data.activeRole);
      })
      .catch((err) => console.error("Error checking role in badge:", err));
  }, []);

  if (!activeFirm) {
    return (
      <button
        onClick={() => router.push("/")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-colors"
      >
        <Building2 className="w-3.5 h-3.5 text-neutral-500" />
        <span>Select Firm Login</span>
      </button>
    );
  }

  const handleSwitchFirm = async (targetFirmId?: string) => {
    setIsSwitching(true);
    try {
      if (targetFirmId) {
        await fetch("/api/auth/firm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firmId: targetFirmId }),
        });
      } else {
        await fetch("/api/auth/firm", {
          method: "DELETE",
        });
      }
      setIsOpen(false);
      router.refresh();
      window.location.reload();
    } catch (err) {
      console.error("Error switching firm:", err);
      setIsSwitching(false);
    }
  };

  const handleToggleRole = async (targetRole: "ADMIN" | "JUNIOR") => {
    setIsSwitching(true);
    try {
      await fetch("/api/auth/firm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      setActiveRole(targetRole);
      setIsOpen(false);
      router.refresh();
      window.location.reload();
    } catch (err) {
      console.error("Error switching role:", err);
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-black text-xs font-semibold transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Building2 className="w-3.5 h-3.5 text-neutral-600" />
        <span className="max-w-[120px] sm:max-w-[160px] truncate">{activeFirm.name}</span>
        <span
          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
            activeRole === "ADMIN"
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {activeRole === "ADMIN" ? "Admin" : "Junior"}
        </span>
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 z-50 p-2.5 text-xs animate-in fade-in-50 zoom-in-95">
            {/* Header */}
            <div className="px-3 py-2 border-b border-neutral-100">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Active Law Chamber
              </div>
              <div className="font-bold text-black text-sm truncate mt-0.5">
                {activeFirm.name}
              </div>
              {activeFirm.leadAdvocate && (
                <div className="text-neutral-500 text-[11px] truncate">
                  Lead: {activeFirm.leadAdvocate}
                </div>
              )}
            </div>

            {/* Role Switcher */}
            <div className="py-2.5 px-3 border-b border-neutral-100 bg-neutral-50/70 rounded-lg my-1.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">
                  Access Level
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    activeRole === "ADMIN"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {activeRole === "ADMIN" ? "Lead Admin (CRUD)" : "Junior (View-Only)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleToggleRole("ADMIN")}
                  className={`px-2 py-1.5 rounded text-[11px] font-semibold border transition-all ${
                    activeRole === "ADMIN"
                      ? "bg-white text-black border-neutral-300 shadow-xs"
                      : "text-neutral-600 border-transparent hover:bg-neutral-100"
                  }`}
                >
                  Admin Mode
                </button>
                <button
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleToggleRole("JUNIOR")}
                  className={`px-2 py-1.5 rounded text-[11px] font-semibold border transition-all ${
                    activeRole === "JUNIOR"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "text-neutral-600 border-transparent hover:bg-neutral-100"
                  }`}
                >
                  Junior Mode
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="py-1 border-b border-neutral-100 space-y-0.5">
              <Link
                href="/attendance"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Chamber Attendance Sheet</span>
              </Link>
              <Link
                href="/onboarding"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-500" />
                <span>Chamber Setup & Roster</span>
              </Link>
            </div>

            {/* Quick Switch List if other firms exist */}
            {allFirms.length > 1 && (
              <div className="py-2 border-b border-neutral-100">
                <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  Switch Chamber
                </div>
                <div className="space-y-0.5 max-h-36 overflow-y-auto">
                  {allFirms.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleSwitchFirm(f.id)}
                      disabled={isSwitching}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left hover:bg-neutral-50 transition-colors ${
                        f.id === activeFirm.id
                          ? "font-semibold text-black bg-neutral-50"
                          : "text-neutral-600"
                      }`}
                    >
                      <span className="truncate">{f.name}</span>
                      {f.id === activeFirm.id && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sign Out */}
            <div className="pt-1.5">
              <button
                type="button"
                disabled={isSwitching}
                onClick={() => handleSwitchFirm()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-red-600 hover:bg-red-50 font-medium transition-colors"
              >
                {isSwitching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Exit Chamber / Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
