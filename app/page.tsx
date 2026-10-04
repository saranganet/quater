import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  Scale,
  PlusCircle,
  Calendar,
  Clock,
  Bell,
  ArrowRight,
  ShieldCheck,
  FileText,
  User,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cases = await prisma.case.findMany({
    include: {
      lawyer: true,
      client: true,
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

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Scale className="w-8 h-8 text-amber-400" />
            Case Monitoring Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Automated Indian court case snapshot storage, change detection pipeline, and WhatsApp alert delivery.
          </p>
        </div>

        <Link
          href="/cases/new"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg transition-all hover:scale-[1.02] self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Add & Fetch Case
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Monitored Cases
          </span>
          <p className="text-3xl font-extrabold text-white">{cases.length}</p>
          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> eCourts Pipeline Active
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Detected Updates
          </span>
          <p className="text-3xl font-extrabold text-amber-400">{totalEvents}</p>
          <span className="text-xs text-slate-400">Hearings, orders & stage changes</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            WhatsApp Alerts
          </span>
          <p className="text-3xl font-extrabold text-emerald-400">{totalNotifications}</p>
          <span className="text-xs text-slate-400">Sent to lawyers & litigants</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            API Source
          </span>
          <p className="text-lg font-bold text-slate-200 truncate mt-1">eCourtsIndia Partner</p>
          <span className="text-xs text-slate-400 font-mono">v4.0 REST Client</span>
        </div>
      </div>

      {/* Cases List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Registered Cases</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cases scheduled for automated tracking and change comparison.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            {cases.length} case{cases.length === 1 ? "" : "s"}
          </span>
        </div>

        {cases.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Scale className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Cases Monitored Yet</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
                Enter an Indian court CNR number to fetch real court case data, save initial snapshots, and enable automated WhatsApp update notifications.
              </p>
            </div>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm shadow transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              Onboard Your First Case
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {cases.map((c) => {
              const snapshot = c.snapshots[0];
              const normalized: any = snapshot?.importantFields;
              const latestEvent = c.events[0];

              return (
                <div
                  key={c.id}
                  className="p-6 hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-md">
                        {c.cnr}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          normalized?.caseStatus === "PENDING"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {normalized?.caseStatus || "ACTIVE"}
                      </span>
                      {c._count.events > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {c._count.events} update{c._count.events === 1 ? "" : "s"} detected
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white">{c.courtName}</h3>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-400">
                      <div>
                        Case No: <span className="text-slate-200 font-semibold">{c.caseNumber}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Lawyer: <span className="text-slate-200 font-medium">{c.lawyer.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        Client: <span className="text-slate-200 font-medium">{c.client.name}</span>
                      </div>
                    </div>

                    {latestEvent && (
                      <div className="mt-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Latest Update: {latestEvent.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Next Hearing
                      </span>
                      <span className="text-sm font-bold text-amber-300">
                        {normalized?.nextHearingDate || "Not Scheduled"}
                      </span>
                    </div>

                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all hover:scale-[1.02]"
                    >
                      View Case & Updates
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Architecture & Pipeline Explanation Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          End-to-End Court Monitoring Pipeline
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Lawyer Enters CNR → eCourtsIndia Partner API Fetches Case → Initial Snapshot & Normalized Important Fields Saved → Subsequent Checks Trigger Asynchronous Refresh & Polling → Change Detection Compares Snapshots → Structured CaseEvents Created → WhatsApp Notification Dispatched to Lawyer and Client.
        </p>
      </div>
    </div>
  );
}
