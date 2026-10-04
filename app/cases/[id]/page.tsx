"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Scale,
  Calendar,
  Clock,
  FileText,
  User,
  RefreshCw,
  FlaskConical,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
  Sparkles,
  Info,
  Code,
  Copy,
  Check,
} from "lucide-react";
import { NormalizedCaseData } from "@/lib/ecourts/types";

interface CaseEventItem {
  id: string;
  eventType: string;
  description: string;
  previousData: any;
  newData: any;
  detectedAt: string;
  notificationStatus: string;
  notifications: Array<{
    id: string;
    recipientType: string;
    recipientPhone: string;
    status: string;
    providerMessageId?: string;
    errorMessage?: string;
    sentAt: string;
  }>;
}

interface CaseDetailData {
  id: string;
  cnr: string;
  courtName: string;
  caseNumber: string;
  filingYear: string | null;
  lastCheckedAt: string | null;
  lastModifiedAt: string | null;
  monitoringEnabled: boolean;
  lawyer: {
    id: string;
    name: string;
    phone: string;
  };
  client: {
    id: string;
    name: string;
    whatsappNumber: string;
  };
  firm?: {
    id: string;
    name: string;
    slug: string;
    leadAdvocate?: string | null;
    contactPhone?: string | null;
    clientMessageIntro?: string | null;
    clientCustomNote?: string | null;
  } | null;
  snapshots: Array<{
    id: string;
    snapshotHash: string;
    rawData: any;
    importantFields: NormalizedCaseData;
    createdAt: string;
  }>;
  events: CaseEventItem[];
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.id;

  const [caseData, setCaseData] = useState<CaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bannerAlert, setBannerAlert] = useState<{
    type: "success" | "info" | "warning";
    title: string;
    message: string;
  } | null>(null);

  // Simulation Modal State
  const [showSimModal, setShowSimModal] = useState(false);
  const [simNextDate, setSimNextDate] = useState("2026-10-21");
  const [simStage, setSimStage] = useState("Arguments & Final Hearing");
  const [simAddOrder, setSimAddOrder] = useState(true);
  const [simOrderDesc, setSimOrderDesc] = useState("ORDER ON INTERIM INJUNCTION");
  const [simCaseStatus, setSimCaseStatus] = useState("PENDING");

  // Raw JSON accordion
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const fetchCaseDetails = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error("Case not found");
      const data = await res.json();
      setCaseData(data.case);
    } catch (err: any) {
      console.error("Failed to load case:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  // Handle Refresh Case
  const handleRefreshCase = async () => {
    setActionLoading("refresh");
    setBannerAlert(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/refresh`, { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Refresh failed");
      }

      await fetchCaseDetails();

      if (data.hasChanges) {
        setBannerAlert({
          type: "success",
          title: "NEW CASE UPDATE DETECTED",
          message: data.message || `Detected ${data.events.length} update(s)! WhatsApp notifications triggered.`,
        });
      } else {
        setBannerAlert({
          type: "info",
          title: "Case Refreshed",
          message: "Data polled from eCourts. No new changes detected since the last snapshot.",
        });
      }
    } catch (err: any) {
      setBannerAlert({
        type: "warning",
        title: "Refresh Error",
        message: err.message || "Failed to refresh case.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Check for Updates (monitorCase)
  const handleCheckUpdates = async () => {
    setActionLoading("monitor");
    setBannerAlert(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/monitor`, { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Update check failed");
      }

      await fetchCaseDetails();

      if (data.hasChanges) {
        setBannerAlert({
          type: "success",
          title: "NEW CASE UPDATE",
          message: data.message,
        });
      } else {
        setBannerAlert({
          type: "info",
          title: "No Updates Detected",
          message: "eCourts registry has no new proceedings or order dates for this case.",
        });
      }
    } catch (err: any) {
      setBannerAlert({
        type: "warning",
        title: "Monitoring Alert",
        message: err.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Simulate Case Update
  const handleSimulateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("simulate");
    setBannerAlert(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextHearingDate: simNextDate,
          stage: simStage,
          addOrder: simAddOrder,
          orderDescription: simOrderDesc,
          caseStatus: simCaseStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Simulation failed");
      }

      setShowSimModal(false);
      await fetchCaseDetails();

      setBannerAlert({
        type: "success",
        title: "NEW CASE UPDATE (SIMULATED)",
        message: `${data.message} Notification records generated and dispatched to Lawyer and Client.`,
      });
    } catch (err: any) {
      setBannerAlert({
        type: "warning",
        title: "Simulation Failed",
        message: err.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const copyRawJson = () => {
    if (!caseData?.snapshots[0]?.rawData) return;
    navigator.clipboard.writeText(JSON.stringify(caseData.snapshots[0].rawData, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-slate-400 text-sm">Retrieving case record from database...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Case Not Found</h2>
        <p className="text-slate-400 text-sm mt-1">The requested case could not be located in the database.</p>
        <Link
          href="/"
          className="inline-block mt-4 text-sm font-semibold text-amber-400 hover:text-amber-300"
        >
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const latestSnapshot = caseData.snapshots[0];
  const normalized = latestSnapshot?.importantFields;
  const rawData = latestSnapshot?.rawData?.courtCaseData ?? latestSnapshot?.rawData;

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-slate-400 gap-2">
        <Link href="/" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-200">{caseData.cnr}</span>
      </nav>

      {/* Case Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono font-bold text-lg text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-lg">
                {caseData.cnr}
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                  normalized?.caseStatus === "PENDING"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : normalized?.caseStatus === "DISPOSED"
                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                }`}
              >
                {normalized?.caseStatus || "ACTIVE"}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Monitoring Enabled
              </span>
              {caseData.firm && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  🏛️ Firm: {caseData.firm.name}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {caseData.courtName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-400">
              <div>
                Case No: <span className="text-slate-200 font-semibold">{caseData.caseNumber}</span>
              </div>
              {caseData.filingYear && (
                <div>
                  Filing Year: <span className="text-slate-200 font-semibold">{caseData.filingYear}</span>
                </div>
              )}
              <div>
                Last Checked:{" "}
                <span className="text-slate-200">
                  {caseData.lastCheckedAt
                    ? new Date(caseData.lastCheckedAt).toLocaleString()
                    : "Just now"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Refresh Case Button */}
            <button
              onClick={handleRefreshCase}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold px-4 py-2.5 rounded-xl border border-slate-700 text-sm transition-all hover:scale-[1.02]"
              title="Queue fresh scrape from official eCourts source"
            >
              <RefreshCw
                className={`w-4 h-4 text-amber-400 ${
                  actionLoading === "refresh" ? "animate-spin" : ""
                }`}
              />
              {actionLoading === "refresh" ? "Polling eCourts..." : "Refresh Case"}
            </button>

            {/* Test Update Detection (Simulation) Button */}
            <button
              onClick={() => setShowSimModal(true)}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02]"
              title="Simulate a case update without hitting eCourts"
            >
              <FlaskConical className="w-4 h-4 text-purple-400" />
              Test Update Detection
            </button>

            {/* Check for Updates (monitorCase) Button */}
            <button
              onClick={handleCheckUpdates}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm shadow transition-all hover:scale-[1.02]"
              title="Run monitorCase() to compare snapshots"
            >
              <Sparkles className="w-4 h-4" />
              {actionLoading === "monitor" ? "Checking..." : "Check for Updates"}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Alert Banner */}
      {bannerAlert && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
            bannerAlert.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
              : bannerAlert.type === "info"
              ? "bg-blue-950/40 border-blue-500/50 text-blue-200"
              : "bg-amber-950/40 border-amber-500/50 text-amber-200"
          }`}
        >
          {bannerAlert.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-bold">{bannerAlert.title}</p>
            <p className="mt-0.5 opacity-90">{bannerAlert.message}</p>
          </div>
        </div>
      )}

      {/* Important Dates & Stage Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next Hearing Date */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
              Next Hearing Date
            </span>
            <p className="text-2xl font-black text-white">
              {normalized?.nextHearingDate || "Not Scheduled"}
            </p>
            <p className="text-xs text-slate-400">
              {normalized?.stage ? `Purpose: ${normalized.stage}` : "Awaiting cause list schedule"}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Last Hearing Date */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Last Hearing Date
            </span>
            <p className="text-2xl font-bold text-slate-100">
              {normalized?.lastHearingDate || "None recorded"}
            </p>
            <p className="text-xs text-slate-400">
              Total Hearings:{" "}
              <span className="text-slate-200 font-semibold">{normalized?.hearingCount ?? 0}</span>
            </p>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-slate-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Orders & Filings */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Orders & Judgments
            </span>
            <p className="text-2xl font-bold text-slate-100">
              {normalized?.orderCount ?? 0} Orders
            </p>
            <p className="text-xs text-slate-400">
              Latest:{" "}
              <span className="text-slate-200">
                {normalized?.latestOrder?.orderDate || "No orders attached"}
              </span>
            </p>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Details Grid: Case Information & Parties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parties & Representatives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Litigants & Advocates */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-amber-400" />
              Litigants & Legal Representatives
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* Petitioners */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Petitioner(s)
                </span>
                {normalized?.petitioners && normalized.petitioners.length > 0 ? (
                  normalized.petitioners.map((p, idx) => (
                    <div key={idx} className="font-semibold text-slate-200">
                      {p}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic">Not specified</div>
                )}
              </div>

              {/* Respondents */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Respondent(s)
                </span>
                {normalized?.respondents && normalized.respondents.length > 0 ? (
                  normalized.respondents.map((r, idx) => (
                    <div key={idx} className="font-semibold text-slate-200">
                      {r}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic">Not specified</div>
                )}
              </div>
            </div>

            {/* Advocates & Judges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-medium">Advocate(s) on Record:</span>
                <span className="text-slate-200 font-semibold">
                  {normalized?.advocates?.length
                    ? normalized.advocates.join(", ")
                    : "Advocate details not registered"}
                </span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-medium">Presiding Judge:</span>
                <span className="text-slate-200 font-semibold">
                  {normalized?.judges?.length
                    ? normalized.judges.join(", ")
                    : normalized?.latestHearing?.judge || "Designated Bench"}
                </span>
              </div>
            </div>
          </div>

          {/* Hearing History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Hearing History ({normalized?.hearingCount ?? 0})
              </span>
              <span className="text-xs font-normal text-slate-400">
                Official court diary
              </span>
            </h2>

            {rawData?.historyOfCaseHearings && rawData.historyOfCaseHearings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Hearing Date</th>
                      <th className="py-2.5 px-3">Business on Date</th>
                      <th className="py-2.5 px-3">Purpose of Listing</th>
                      <th className="py-2.5 px-3">Judge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {rawData.historyOfCaseHearings.map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-amber-300">
                          {h.hearingDate || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {h.businessOnDate || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-sans">
                          {h.purposeOfListing || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">
                          {h.judge || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No historical hearings listed yet.</p>
            )}
          </div>

          {/* Orders & Judgments List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Orders & Judgments ({normalized?.orderCount ?? 0})
              </span>
            </h2>

            {(rawData?.interimOrders?.length || rawData?.judgmentOrders?.length) ? (
              <div className="space-y-2">
                {[...(rawData?.interimOrders || []), ...(rawData?.judgmentOrders || [])].map(
                  (ord: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-semibold text-slate-200">
                            {ord.description || ord.orderType || "Court Order"}
                          </p>
                          <p className="text-slate-400">Order Date: {ord.orderDate}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {ord.orderUrl}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No interim orders or judgments uploaded.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar: Notification Recipients & Change Detection Feed */}
        <div className="space-y-6">
          {/* Notification Recipients Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Bell className="w-4 h-4 text-emerald-400" />
              Automated Alert Recipients
            </h2>

            <div className="space-y-3 text-xs">
              {/* Lawyer */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400">Lawyer</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    WhatsApp Active
                  </span>
                </div>
                <p className="font-medium text-slate-200">{caseData.lawyer.name}</p>
                <p className="font-mono text-slate-400">{caseData.lawyer.phone}</p>
                <a
                  href={`https://wa.me/${caseData.lawyer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `⚖️ Case Update\n\nCase: ${caseData.caseNumber}\nCNR: ${caseData.cnr}\n\n${caseData.events[0]?.description || "Case update monitored"}\n\nNext hearing: ${normalized?.nextHearingDate || "To be notified"}\n\nPlease check the case details or contact your advocate for further information.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow"
                >
                  <Send className="w-3 h-3" />
                  Open in WhatsApp (1-Click)
                </a>
              </div>

              {/* Client */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400">Client</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    WhatsApp Active
                  </span>
                </div>
                <p className="font-medium text-slate-200">{caseData.client.name}</p>
                <p className="font-mono text-slate-400">{caseData.client.whatsappNumber}</p>
                <a
                  href={`https://wa.me/${caseData.client.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `⚖️ Case Update\n\nCase: ${caseData.caseNumber}\nCNR: ${caseData.cnr}\n\n${caseData.events[0]?.description || "Case update monitored"}\n\nNext hearing: ${normalized?.nextHearingDate || "To be notified"}\n\nPlease check the case details or contact your advocate for further information.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow"
                >
                  <Send className="w-3 h-3" />
                  Open in WhatsApp (1-Click)
                </a>
              </div>
            </div>
          </div>

          {/* Change Detection & Event History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                Detected Updates ({caseData.events.length})
              </span>
            </h2>

            {caseData.events.length > 0 ? (
              <div className="space-y-3">
                {caseData.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {ev.eventType}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ev.detectedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-200">{ev.description}</p>

                    {/* WhatsApp Notification status for this event */}
                    {ev.notifications.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          WhatsApp Dispatch
                        </span>
                        {ev.notifications.map((n) => (
                          <div
                            key={n.id}
                            className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900 px-2 py-1 rounded"
                          >
                            <span>
                              {n.recipientType}: {n.recipientPhone.slice(0, 4)}****
                              {n.recipientPhone.slice(-4)}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                n.status === "SENT"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : n.status === "MOCKED"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : "bg-rose-500/15 text-rose-400"
                              }`}
                            >
                              {n.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No change events recorded yet. Click &quot;Test Update Detection&quot; or &quot;Refresh Case&quot; to test.
              </p>
            )}
          </div>

          {/* Raw eCourts API Inspector Accordion */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Code className="w-4 h-4 text-slate-400" />
                Raw eCourts API Snapshot
                <span className="text-[10px] text-slate-400">
                  ({showRawJson ? "Hide" : "Inspect"})
                </span>
              </button>

              {showRawJson && (
                <button
                  onClick={copyRawJson}
                  className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded border border-slate-700"
                >
                  {copiedRaw ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy JSON
                    </>
                  )}
                </button>
              )}
            </div>

            {showRawJson && (
              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-300 overflow-x-auto max-h-80 font-mono">
                {JSON.stringify(latestSnapshot?.rawData, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Modal (First Test Mode) */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-purple-400" />
                  Test Update Detection (Simulation)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate an official case update without making external eCourts requests.
                </p>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateUpdate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-200 block">
                  Simulate New Next Hearing Date
                </label>
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <span>Current:</span>
                  <span className="font-mono text-amber-300">
                    {normalized?.nextHearingDate || "None"}
                  </span>
                </div>
                <input
                  type="date"
                  value={simNextDate}
                  onChange={(e) => setSimNextDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200 block">
                  Simulate Updated Stage
                </label>
                <input
                  type="text"
                  value={simStage}
                  onChange={(e) => setSimStage(e.target.value)}
                  placeholder="e.g. Arguments & Evidence"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simAddOrder}
                    onChange={(e) => setSimAddOrder(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                  />
                  Simulate New Court Order Upload
                </label>

                {simAddOrder && (
                  <input
                    type="text"
                    value={simOrderDesc}
                    onChange={(e) => setSimOrderDesc(e.target.value)}
                    placeholder="Order Description"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs mt-1"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-200 block">
                  Case Status
                </label>
                <select
                  value={simCaseStatus}
                  onChange={(e) => setSimCaseStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="DISPOSED">DISPOSED (Case Decided)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoading)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl shadow transition-all"
                >
                  {actionLoading === "simulate" ? "Running..." : "Trigger Simulation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
