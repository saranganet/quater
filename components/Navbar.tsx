import Link from "next/link";
import { Scale, PlusCircle, LayoutDashboard, Bell, ShieldCheck } from "lucide-react";
import { WhatsAppGatewayStatus } from "./WhatsAppGatewayStatus";

export function Navbar() {
  const isWhatsAppLive = process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true";

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg group-hover:bg-amber-500/20 transition-all">
                <Scale className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Quater
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    MVP
                  </span>
                </span>
                <span className="text-xs text-slate-400">
                  Automated Indian Court Updates & WhatsApp Alerting
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links & Action */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            {/* WhatsApp Gateway Quick Status & QR Modal */}
            <WhatsAppGatewayStatus />

            <Link
              href="/cases/new"
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm shadow transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              Add & Fetch Case
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
