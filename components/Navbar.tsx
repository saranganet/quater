"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, LayoutDashboard, Calendar, CalendarCheck, Settings, Building2 } from "lucide-react";
import { WhatsAppGatewayStatus } from "./WhatsAppGatewayStatus";
import { ActiveFirmBadge } from "./ActiveFirmBadge";

export function Navbar() {
  const [activeFirm, setActiveFirm] = useState<any>(null);
  const [allFirms, setAllFirms] = useState<any[]>([]);
  const [activeRole, setActiveRole] = useState<"ADMIN" | "JUNIOR">("ADMIN");

  useEffect(() => {
    fetch("/api/auth/firm")
      .then((res) => res.json())
      .then((data) => {
        if (data.activeFirm) setActiveFirm(data.activeFirm);
        if (Array.isArray(data.firms)) setAllFirms(data.firms);
        if (data.activeRole) setActiveRole(data.activeRole);
      })
      .catch((err) => console.error("Error loading firm session in navbar:", err));
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-200 text-neutral-900">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm tracking-tight">
                Q
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold tracking-tight text-black">
                  QUATER
                </span>
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest hidden sm:inline">
                  Court Dispatch
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links & Action */}
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>

            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Calendar</span>
            </Link>

            <Link
              href="/attendance"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">Attendance</span>
            </Link>

            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden lg:inline">Chamber Setup</span>
            </Link>

            {/* Active Firm Selector / Badge with RBAC */}
            <ActiveFirmBadge activeFirm={activeFirm} allFirms={allFirms} />

            {/* WhatsApp Gateway Quick Status & QR Modal */}
            <WhatsAppGatewayStatus />

            {/* Track Case Action - only for ADMIN */}
            {activeRole === "ADMIN" ? (
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-semibold px-3 py-1.5 rounded-md text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Track Case</span>
              </Link>
            ) : (
              <div
                title="Junior Advocates have view-only access. Contact Lead Advocate to register new cases."
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-100 text-neutral-400 text-[11px] font-mono border border-neutral-200 cursor-not-allowed"
              >
                <span>View-Only</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
