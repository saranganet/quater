import Link from "next/link";
import prisma from "@/lib/prisma";
import { Plus, ArrowUpRight, Building2, Phone, UserCheck, ShieldCheck } from "lucide-react";
import { getActiveFirm, getActiveRole } from "@/lib/firm-session";
import { FirmLoginPortal } from "@/components/FirmLoginPortal";
import { ChamberHeaderActions } from "@/components/ChamberHeaderActions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const activeFirm = await getActiveFirm();
  const activeRole = await getActiveRole();

  // If no firm is selected/logged in, show the Firm Login & Chamber Selection Portal
  if (!activeFirm) {
    const firms = await prisma.firm.findMany({
      include: {
        _count: {
          select: { cases: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return <FirmLoginPortal firms={firms} />;
  }

  // Firm is logged in: Query only matters and metrics belonging to this specific firm
  const cases = await prisma.case.findMany({
    where: { firmId: activeFirm.id },
    include: {
      lawyer: true,
      client: true,
      firm: true,
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      events: {
        orderBy: { detectedAt: "desc" },
        take: 1,
      },
      _count: {
        select: { events: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalEvents = await prisma.caseEvent.count({
    where: {
      case: { firmId: activeFirm.id },
    },
  });

  const totalNotifications = await prisma.notification.count({
    where: {
      caseEvent: {
        case: { firmId: activeFirm.id },
      },
    },
  });

  const skippedDuplicates = await prisma.notification.count({
    where: {
      status: "DUPLICATE_SKIPPED",
      caseEvent: {
        case: { firmId: activeFirm.id },
      },
    },
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Active Chamber Identification Banner */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Isolated Chamber
              </span>
              <span
                className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  activeRole === "ADMIN"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }`}
              >
                {activeRole === "ADMIN" ? "Lead Admin (Full CRUD)" : "Junior Advocate (View-Only)"}
              </span>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                {activeFirm.dispatchMode === "MANUAL" ? "✏️ Manual Dispatch" : "⚡ Auto Dispatch"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black mt-1">
              {activeFirm.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 mt-1 font-sans">
              {activeFirm.leadAdvocate && (
                <div className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-neutral-500 font-mono text-[11px]">Lead:</span>
                  <span className="font-medium text-neutral-800">{activeFirm.leadAdvocate}</span>
                </div>
              )}
              {activeFirm.contactPhone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-neutral-500 font-mono text-[11px]">Chamber Phone:</span>
                  <span className="font-mono text-neutral-800">{activeFirm.contactPhone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors"
          >
            <span>Daily Attendance</span>
          </Link>

          <ChamberHeaderActions />

          {activeRole === "ADMIN" ? (
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-medium px-3.5 py-1.5 rounded-md text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track New Case</span>
            </Link>
          ) : (
            <div
              title="Junior advocates have view-only access"
              className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-400 text-xs font-mono border border-neutral-200"
            >
              View-Only Mode
            </div>
          )}
        </div>
      </div>

      {/* Metrics Row (Strictly Scoped to Active Firm) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 divide-x divide-y lg:divide-y-0 divide-neutral-200 rounded-lg overflow-hidden bg-white">
        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Chamber Matters
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-black mt-1">
            {cases.length}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active eCourts Polling
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Detected Updates
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-black mt-1">
            {totalEvents}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">
            Hearings, orders & listings
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Dispatches Logged
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-black mt-1">
            {totalNotifications}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">
            WhatsApp updates sent
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Duplicates Suppressed
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-black mt-1">
            {skippedDuplicates}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">
            0 repetitive messages sent
          </div>
        </div>
      </div>

      {/* Main Cases Table - Isolated to This Firm */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-black">
            Registered Chamber Matters ({cases.length})
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            Confidential to {activeFirm.name}
          </span>
        </div>

        {cases.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-neutral-500 font-mono">
              No cases currently monitored for {activeFirm.name}.
            </p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Add your CNR number below. All case updates, hearings, and client WhatsApp notifications will be automatically isolated under your chamber.
            </p>
            <div className="pt-2">
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Track First Case
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">CNR / Case ID</th>
                  <th className="py-3 px-5">Court Establishment</th>
                  <th className="py-3 px-5">Lawyer / Advocate</th>
                  <th className="py-3 px-5">Client</th>
                  <th className="py-3 px-5">Next Hearing</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-sans">
                {cases.map((c) => {
                  const snapshot = c.snapshots[0];
                  const normalized: any = snapshot?.importantFields;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-neutral-50/80 transition-colors group"
                    >
                      {/* CNR */}
                      <td className="py-3.5 px-5">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-mono font-bold text-black group-hover:underline text-[13px] block"
                        >
                          {c.cnr}
                        </Link>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {c.caseNumber}
                        </span>
                      </td>

                      {/* Court */}
                      <td className="py-3.5 px-5 text-neutral-700 font-medium max-w-xs truncate">
                        {c.courtName}
                      </td>

                      {/* Lawyer */}
                      <td className="py-3.5 px-5 text-neutral-800">
                        <div className="font-medium text-black">{c.lawyer.name}</div>
                        <div className="font-mono text-[11px] text-neutral-400">
                          {c.lawyer.phone}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-5 text-neutral-800">
                        <div className="font-medium text-black">{c.client.name}</div>
                        <div className="font-mono text-[11px] text-neutral-400">
                          {c.client.whatsappNumber}
                        </div>
                      </td>

                      {/* Next Hearing */}
                      <td className="py-3.5 px-5 font-mono">
                        {normalized?.nextHearingDate ? (
                          <span className="font-semibold text-black bg-neutral-100 px-2 py-0.5 rounded">
                            {normalized.nextHearingDate}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border border-neutral-300 bg-white text-neutral-900">
                          {normalized?.caseStatus || "ACTIVE"}
                        </span>
                        {c._count.events > 0 && (
                          <span className="ml-1.5 text-[10px] font-mono text-neutral-500">
                            ({c._count.events} updates)
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-black hover:underline"
                        >
                          View Diary <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
