import Link from "next/link";
import { Plus, LayoutDashboard } from "lucide-react";
import { WhatsAppGatewayStatus } from "./WhatsAppGatewayStatus";

export function Navbar() {
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
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </Link>

            {/* WhatsApp Gateway Quick Status & QR Modal */}
            <WhatsAppGatewayStatus />

            <Link
              href="/cases/new"
              className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Track Case
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
