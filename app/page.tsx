import Link from "next/link";
import prisma from "@/lib/prisma";
import { Plus, ArrowUpRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cases = await prisma.case.findMany({
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

  const totalEvents = await prisma.caseEvent.count();
  const totalNotifications = await prisma.notification.count();
  const skippedDuplicates = await prisma.notification.count({
    where: { status: "DUPLICATE_SKIPPED" },
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
            eCourtsIndia Automated Pipeline
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black mt-1">
            Cases & Monitoring Overview
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-medium px-4 py-2 rounded-md text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Track New Case
          </Link>
        </div>
      </div>

      {/* Metrics Row (Hairline Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 divide-x divide-y lg:divide-y-0 divide-neutral-200 rounded-lg overflow-hidden bg-white">
        <div className="p-4 sm:p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Tracked Matters
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
            Delivered to lawyers & clients
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

      {/* Main Cases Table - Full Screen Width */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-black">
            Registered Court Diaries ({cases.length})
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            Auto-checks against eCourts Partner API
          </span>
        </div>

        {cases.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm text-neutral-500 font-mono">No cases currently monitored.</p>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Track First Case
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">CNR / Case ID</th>
                  <th className="py-3 px-5">Court Establishment</th>
                  <th className="py-3 px-5">Assigned Law Firm</th>
                  <th className="py-3 px-5">Lawyer</th>
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

                      {/* Firm */}
                      <td className="py-3.5 px-5">
                        {c.firm ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-black border border-neutral-200">
                            {c.firm.name}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">Direct</span>
                        )}
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
