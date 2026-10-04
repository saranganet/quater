"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  FlaskConical,
  Send,
  Loader2,
  X,
  Copy,
  Check,
  Calendar,
  FileText,
  User,
  ShieldAlert,
} from "lucide-react";
import { NormalizedCaseData } from "@/lib/ecourts/types";

interface CaseEventItem {
  id: string;
  eventType: string;
  eventKey?: string;
  description: string;
  previousData: any;
  newData: any;
  detectedAt: string;
  notificationStatus: string;
  notifications: Array<{
    id: string;
    recipientType: string;
    recipientName?: string | null;
    recipientPhone: string;
    messageBody?: string | null;
    status: string;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt: string | null;
    createdAt?: string;
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
  const [simNextDate, setSimNextDate] = useState("2026-11-20");
  const [simStage, setSimStage] = useState("Arguments & Final Hearing");
  const [simAddOrder, setSimAddOrder] = useState(true);
  const [simOrderDesc, setSimOrderDesc] = useState("ORDER ON INTERIM INJUNCTION");
  const [simCaseStatus, setSimCaseStatus] = useState("PENDING");

  // Raw JSON
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
          title: "NEW UPDATE DETECTED",
          message: data.message || `Detected ${data.events.length} update(s). WhatsApp notifications dispatched.`,
        });
      } else {
        setBannerAlert({
          type: "info",
          title: "DIARY POLLED",
          message: "No new changes recorded on eCourts since last check.",
        });
      }
    } catch (err: any) {
      setBannerAlert({
        type: "warning",
        title: "REFRESH ERROR",
        message: err.message || "Failed to poll eCourts.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckUpdates = async () => {
    setActionLoading("monitor");
    setBannerAlert(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/monitor`, { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Monitor failed");
      }

      await fetchCaseDetails();

      if (data.hasChanges) {
        setBannerAlert({
          type: "success",
          title: "CASE UPDATED",
          message: `${data.message} Notifications sent or evaluated.`,
        });
      } else {
        setBannerAlert({
          type: "info",
          title: "UP TO DATE",
          message: "Snapshot compared. Zero differences detected.",
        });
      }
    } catch (err: any) {
      setBannerAlert({
        type: "warning",
        title: "CHECK FAILED",
        message: err.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
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
        title: "SIMULATION COMPLETED",
        message: `${data.message} Delivery logged and idempotency checked.`,
      });
    } catch (err: any) {
      setBannerAlert({
        type: "warning",
        title: "SIMULATION ERROR",
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
      <div className="py-24 text-center space-y-3 font-mono text-xs text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" />
        <p>Loading case record...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="py-16 text-center space-y-3 font-mono text-xs">
        <p className="text-black font-bold">Case record not found.</p>
        <Link href="/" className="text-neutral-500 hover:text-black underline">
          Return to Overview
        </Link>
      </div>
    );
  }

  const latestSnapshot = caseData.snapshots[0];
  const normalized = latestSnapshot?.importantFields;
  const rawData = latestSnapshot?.rawData;

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-neutral-200 pb-5">
        <div className="space-y-1.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
          </Link>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-mono text-xs font-bold text-black bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
              {caseData.cnr}
            </span>
            <span className="font-mono text-[11px] text-neutral-500">
              Case No. {caseData.caseNumber}
            </span>
            {caseData.firm && (
              <span className="font-mono text-[11px] text-black px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-medium">
                {caseData.firm.name}
              </span>
            )}
            <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-black bg-black text-white">
              {normalized?.caseStatus || "ACTIVE"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black pt-1">
            {caseData.courtName}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshCase}
            disabled={Boolean(actionLoading)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neutral-300 hover:border-black rounded-md bg-white text-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === "refresh" ? "animate-spin" : ""}`} />
            {actionLoading === "refresh" ? "Polling eCourts..." : "Poll eCourts"}
          </button>

          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            disabled={Boolean(actionLoading)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neutral-300 hover:border-black rounded-md bg-white text-neutral-800 transition-colors disabled:opacity-50"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Simulate Update
          </button>

          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={Boolean(actionLoading)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-black hover:bg-neutral-800 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {actionLoading === "monitor" ? "Detecting..." : "Run Detection"}
          </button>
        </div>
      </div>

      {/* Banner Alerts */}
      {bannerAlert && (
        <div className="p-3.5 rounded-md border border-neutral-300 bg-neutral-50 text-xs font-mono flex items-start justify-between gap-3 text-neutral-900">
          <div>
            <span className="font-bold uppercase">[{bannerAlert.title}]</span>{" "}
            <span>{bannerAlert.message}</span>
          </div>
          <button
            onClick={() => setBannerAlert(null)}
            className="text-neutral-400 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Full-Width Grid: Left Details (65%) + Right Audit/Actions (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols on large screens) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Next Listing & Status Card */}
          <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-black block">
              Upcoming Listing & Stage
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-neutral-200 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 rounded-md p-3.5 bg-neutral-50/50">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Next Hearing Date
                </span>
                <span className="text-lg font-mono font-bold text-black mt-0.5 block">
                  {normalized?.nextHearingDate || "Not Scheduled"}
                </span>
              </div>
              <div className="pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Stage of Case
                </span>
                <span className="text-sm font-medium text-neutral-800 mt-1 block">
                  {normalized?.stage || "Pre-trial / Regular Listing"}
                </span>
              </div>
              <div className="pt-2 sm:pt-0 sm:pl-4">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Presiding Court
                </span>
                <span className="text-xs text-neutral-700 mt-1 block truncate">
                  {normalized?.latestHearing?.judge || caseData.courtName}
                </span>
              </div>
            </div>
          </div>

          {/* Litigants & Advocates */}
          <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-black block">
              Parties to Matter
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-md border border-neutral-200 bg-neutral-50/50 space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Petitioner / Plaintiff
                </span>
                <p className="font-semibold text-black text-xs">
                  {normalized?.petitioners?.[0] || "Petitioner on Record"}
                </p>
              </div>

              <div className="p-3.5 rounded-md border border-neutral-200 bg-neutral-50/50 space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Respondent / Defendant
                </span>
                <p className="font-semibold text-black text-xs">
                  {normalized?.respondents?.[0] || "Respondent on Record"}
                </p>
              </div>
            </div>
          </div>

          {/* Hearing History Table */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Hearing History ({normalized?.hearingCount ?? 0})
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Official Court Diary
              </span>
            </div>

            {rawData?.historyOfCaseHearings && rawData.historyOfCaseHearings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/60 border-b border-neutral-200 text-neutral-500 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Hearing Date</th>
                      <th className="py-2.5 px-4">Business on Date</th>
                      <th className="py-2.5 px-4">Purpose of Listing</th>
                      <th className="py-2.5 px-4">Judge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono text-xs">
                    {rawData.historyOfCaseHearings.map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-4 font-semibold text-black">
                          {h.hearingDate || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-600">
                          {h.businessOnDate || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-900 font-sans">
                          {h.purposeOfListing || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-500 font-sans">
                          {h.judge || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-xs font-mono text-neutral-400 italic">
                No past hearings recorded.
              </p>
            )}
          </div>

          {/* Orders & Filings Table */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Orders &amp; Judgments ({normalized?.orderCount ?? 0})
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Judicial Filings
              </span>
            </div>

            {rawData?.orders && rawData.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/60 border-b border-neutral-200 text-neutral-500 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Order Date</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-right">PDF File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs font-mono">
                    {rawData.orders.map((o: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-4 font-semibold text-black">
                          {o.orderDate || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-700 font-sans">
                          {o.orderNumber || o.orderType || "Court Proceeding Order"}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="text-[11px] text-neutral-400">
                            {o.orderUrl || "Filed on record"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-xs font-mono text-neutral-400 italic">
                No order documents attached yet.
              </p>
            )}
          </div>
        </div>

        {/* Right Column (4 cols on large screens): WhatsApp Dispatch & Audit Log */}
        <div className="lg:col-span-4 space-y-6">
          {/* Contacts Box */}
          <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-black block">
              Registered Contacts
            </span>

            <div className="space-y-3">
              {/* Lawyer */}
              <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-neutral-400 uppercase">Lawyer</span>
                  <span className="font-mono text-emerald-600 text-[10px]">● Registered</span>
                </div>
                <div className="font-semibold text-xs text-black">{caseData.lawyer.name}</div>
                <div className="font-mono text-xs text-neutral-600">{caseData.lawyer.phone}</div>
                <a
                  href={`https://wa.me/${caseData.lawyer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Case Update: ${caseData.caseNumber} (CNR: ${caseData.cnr}). Next hearing: ${normalized?.nextHearingDate || "Pending"}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-black hover:underline"
                >
                  <Send className="w-3 h-3" /> Manual WhatsApp Link
                </a>
              </div>

              {/* Client */}
              <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-neutral-400 uppercase">Client</span>
                  <span className="font-mono text-emerald-600 text-[10px]">● Registered</span>
                </div>
                <div className="font-semibold text-xs text-black">{caseData.client.name}</div>
                <div className="font-mono text-xs text-neutral-600">{caseData.client.whatsappNumber}</div>
                <a
                  href={`https://wa.me/${caseData.client.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Update from ${caseData.firm?.name || "Counsel"}: Case ${caseData.caseNumber}. Next hearing: ${normalized?.nextHearingDate || "Pending"}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-black hover:underline"
                >
                  <Send className="w-3 h-3" /> Manual WhatsApp Link
                </a>
              </div>
            </div>
          </div>

          {/* WhatsApp Delivery & Audit Trail */}
          <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Delivery &amp; Audit Trail
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Idempotency Guard Active
              </span>
            </div>

            {caseData.events.length > 0 ? (
              <div className="space-y-4">
                {caseData.events.map((ev) => (
                  <div key={ev.id} className="space-y-2 pb-3 border-b border-neutral-100 last:border-b-0">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-black uppercase">
                        {ev.eventType}
                      </span>
                      <span className="text-neutral-400 text-[10px]">
                        {new Date(ev.detectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 font-sans leading-snug">
                      {ev.description}
                    </p>

                    {/* Dispatches */}
                    {ev.notifications.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {ev.notifications.map((n) => (
                          <div
                            key={n.id}
                            className="p-2.5 rounded border border-neutral-200 bg-neutral-50/70 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-black text-[11px]">
                                {n.recipientType === "LAWYER" ? "Lawyer" : "Client"}:{" "}
                                {n.recipientName || (n.recipientType === "LAWYER" ? caseData.lawyer.name : caseData.client.name)}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  n.status === "SENT"
                                    ? "bg-black text-white"
                                    : n.status === "DUPLICATE_SKIPPED"
                                    ? "bg-neutral-200 text-neutral-700"
                                    : "bg-neutral-100 text-neutral-500"
                                }`}
                              >
                                {n.status === "SENT"
                                  ? "Delivered"
                                  : n.status === "DUPLICATE_SKIPPED"
                                  ? "Dedup Skipped"
                                  : n.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                              <span>{n.recipientPhone.slice(0, 5)}****{n.recipientPhone.slice(-4)}</span>
                              <span>{n.sentAt ? new Date(n.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Logged"}</span>
                            </div>

                            {n.messageBody && (
                              <details className="text-[10px] font-mono pt-1 text-neutral-500">
                                <summary className="cursor-pointer hover:text-black">
                                  View Dispatched WhatsApp Copy
                                </summary>
                                <div className="mt-1 p-2 bg-white rounded border border-neutral-200 text-[10px] whitespace-pre-wrap leading-relaxed text-black">
                                  {n.messageBody}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-neutral-400 italic">
                No events recorded yet. Run a detection or simulation to test.
              </p>
            )}
          </div>

          {/* Raw JSON Accordion */}
          <div className="border border-neutral-200 rounded-lg p-4 bg-white">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full flex items-center justify-between text-xs font-mono text-neutral-600 hover:text-black"
            >
              <span>{showRawJson ? "Hide Raw Data" : "Inspect Raw eCourts Data"}</span>
              <span className="font-bold">{showRawJson ? "−" : "+"}</span>
            </button>

            {showRawJson && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={copyRawJson}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-500 hover:text-black"
                >
                  {copiedRaw ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedRaw ? "Copied" : "Copy JSON"}
                </button>
                <pre className="p-3 bg-neutral-50 border border-neutral-200 rounded text-[10px] font-mono overflow-x-auto max-h-80 text-black">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Modal (Black & White Minimalist) */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white border border-neutral-200 rounded-xl p-6 shadow-2xl space-y-5 text-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Simulate Case Diary Update
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Test change detection, deduplication &amp; WhatsApp alerts locally
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimulate} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-black">
                  Next Hearing Date
                </label>
                <input
                  type="date"
                  value={simNextDate}
                  onChange={(e) => setSimNextDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs font-mono text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-black">
                  Case Stage
                </label>
                <input
                  type="text"
                  value={simStage}
                  onChange={(e) => setSimStage(e.target.value)}
                  placeholder="e.g. Final Arguments"
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-neutral-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-black">
                  <input
                    type="checkbox"
                    checked={simAddOrder}
                    onChange={(e) => setSimAddOrder(e.target.checked)}
                    className="rounded border-neutral-300 text-black focus:ring-black"
                  />
                  <span>Attach Simulated New Order</span>
                </label>

                {simAddOrder && (
                  <input
                    type="text"
                    value={simOrderDesc}
                    onChange={(e) => setSimOrderDesc(e.target.value)}
                    placeholder="Order Description"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                  />
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-neutral-600 hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoading)}
                  className="px-4 py-2 rounded-md bg-black hover:bg-neutral-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {actionLoading === "simulate" ? "Running..." : "Apply & Trigger Alerts"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
