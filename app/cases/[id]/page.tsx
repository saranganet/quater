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
  ShieldCheck,
  Plus,
  Trash2,
  UserCheck,
  Users,
  Phone,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { NormalizedCaseData } from "@/lib/ecourts/types";
import { formatDateDMY } from "@/lib/whatsapp/date-formatter";

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
    dispatchMode?: string | null;
  } | null;
  snapshots: Array<{
    id: string;
    snapshotHash: string;
    rawData: any;
    importantFields: NormalizedCaseData;
    createdAt: string;
  }>;
  contacts?: Array<{
    id: string;
    type: string;
    name: string;
    phone: string;
    role?: string | null;
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
  const [activeRole, setActiveRole] = useState<"ADMIN" | "JUNIOR">("ADMIN");
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

  // Manual Dispatch & Message Edit Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchTargetEventId, setDispatchTargetEventId] = useState<string | null>(null);
  const [clientDraft, setClientDraft] = useState("");
  const [lawyerDraft, setLawyerDraft] = useState("");
  const [sendToClient, setSendToClient] = useState(true);
  const [sendToLawyer, setSendToLawyer] = useState(true);
  const [sendToContacts, setSendToContacts] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);

  // Raw JSON
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Additional Contacts Management
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactType, setContactType] = useState<"LAWYER" | "CLIENT">("LAWYER");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("Junior Advocate");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

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

  const fetchSessionRole = async () => {
    try {
      const res = await fetch("/api/auth/firm");
      const data = await res.json();
      if (data.activeRole) setActiveRole(data.activeRole);
    } catch (err) {
      console.error("Failed to fetch session role:", err);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
    fetchSessionRole();
  }, [caseId]);

  const openDispatchModal = (eventItem?: CaseEventItem) => {
    if (!caseData) return;
    const nextDate = caseData.snapshots[0]?.importantFields?.nextHearingDate;
    const formattedHearingDate = formatDateDMY(nextDate);
    const firmName = caseData.firm?.name || "Your Legal Counsel";
    const contactPhone = caseData.firm?.contactPhone || "+91 98506 70809";
    const nextHearingText = formattedHearingDate
      ? `📅 *Next Hearing Date:* ${formattedHearingDate}`
      : "📅 *Next Hearing Date:* To be scheduled";

    // 1. Client Draft: strictly omit status and counsel notes
    const clientIntro =
      caseData.firm?.clientMessageIntro ||
      `Dear ${caseData.client.name}, greetings from ${firmName}. Here is an official court update regarding your ongoing matter:`;

    const clientMsg = `⚖️ *COURT CASE UPDATE*
*${firmName}*

${clientIntro}

📋 *Case:* ${caseData.caseNumber || "N/A"}
🏛️ *Court:* ${caseData.courtName || "eCourts India"}
🆔 *CNR:* ${caseData.cnr}
${nextHearingText}

📞 *Contact:* ${contactPhone}

_Sent on behalf of ${firmName} via Quater Notification System._`;

    // 2. Lawyer Draft: includes full status update
    const updateText = eventItem ? eventItem.description : "Matter listed for next date / proceeding.";
    const lawyerMsg = `⚖️ *[QUATER CASE ALERT]*
Advocate, there is an official update for your tracked case:

📋 *Case:* ${caseData.caseNumber || "N/A"}
🏛️ *Court:* ${caseData.courtName || "eCourts India"}
🆔 *CNR:* ${caseData.cnr}

🔔 *Update:* ${updateText}
${formattedHearingDate ? `📅 *Next Hearing:* ${formattedHearingDate}` : "📅 *Next Hearing:* To be scheduled"}

✅ _Client (${caseData.client.name}) notified._
_Powered by Quater Legal Updates_`;

    setClientDraft(clientMsg);
    setLawyerDraft(lawyerMsg);
    setDispatchTargetEventId(eventItem ? eventItem.id : null);
    setDispatchFeedback(null);
    setShowDispatchModal(true);
  };

  const handleSendManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRole === "JUNIOR") return;
    setIsDispatching(true);
    setDispatchFeedback(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseEventId: dispatchTargetEventId || undefined,
          clientMessage: clientDraft,
          lawyerMessage: lawyerDraft,
          sendToClient,
          sendToLawyer,
          sendToContacts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch message");

      setBannerAlert({
        type: "success",
        title: "WHATSAPP DISPATCHED",
        message: `Custom update successfully dispatched to ${data.dispatchedCount} recipient(s).`,
      });
      setShowDispatchModal(false);
      await fetchCaseDetails();
    } catch (err: any) {
      setDispatchFeedback(err.message || "Failed to dispatch WhatsApp message");
    } finally {
      setIsDispatching(false);
    }
  };

  const handleDeleteCase = async () => {
    if (activeRole === "JUNIOR") return;
    if (
      !confirm(
        `Are you sure you want to remove Case ${caseData?.caseNumber || caseData?.cnr} from chamber tracking? This will permanently delete snapshots and diary audit records.`
      )
    )
      return;

    setActionLoading("delete");
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete case");
      window.location.href = "/";
    } catch (err: any) {
      setBannerAlert({
        type: "warning",
        title: "DELETE FAILED",
        message: err.message,
      });
      setActionLoading(null);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setIsSubmittingContact(true);

    try {
      const res = await fetch(`/api/cases/${caseId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          phone: contactPhone.trim(),
          type: contactType,
          role: contactRole.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add contact");
      }

      setContactName("");
      setContactPhone("");
      setShowAddContactModal(false);
      await fetchCaseDetails();
    } catch (err: any) {
      setContactError(err.message || "Failed to add contact");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (activeRole === "JUNIOR") return;
    try {
      const res = await fetch(`/api/cases/${caseId}/contacts?contactId=${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCaseDetails();
      }
    } catch (err) {
      console.error("Failed to delete contact:", err);
    }
  };

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
          message: data.message || `Detected ${data.events.length} update(s).`,
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
          message: `${data.message} Notifications processed.`,
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
  const isChamberManual = caseData.firm?.dispatchMode === "MANUAL";

  return (
    <div className="w-full space-y-6">
      {/* Role Alert Banner for Junior Advocates */}
      {activeRole === "JUNIOR" && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Junior Advocate View-Only Mode:</strong> You can view all case details, diary entries, and audit logs. Adding, editing, assigning, deleting cases, and dispatching WhatsApp messages are restricted to Lead Counsel.
            </span>
          </div>
          <Link
            href="/onboarding"
            className="text-[11px] font-mono text-blue-700 underline shrink-0 hover:text-blue-900"
          >
            Switch Role
          </Link>
        </div>
      )}

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
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                isChamberManual
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {isChamberManual ? "Manual Dispatch" : "Auto Dispatch"}
            </span>
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
          {/* Manual Dispatch Button for Lead Lawyer */}
          {activeRole === "ADMIN" && (
            <button
              type="button"
              onClick={() => openDispatchModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-purple-700 hover:bg-purple-800 text-white shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Review & Dispatch WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefreshCase}
            disabled={Boolean(actionLoading)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neutral-300 hover:border-black rounded-md bg-white text-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === "refresh" ? "animate-spin" : ""}`} />
            {actionLoading === "refresh" ? "Polling eCourts..." : "Poll eCourts"}
          </button>

          {activeRole === "ADMIN" && (
            <button
              type="button"
              onClick={() => setShowSimModal(true)}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neutral-300 hover:border-black rounded-md bg-white text-neutral-800 transition-colors disabled:opacity-50"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Simulate Update
            </button>
          )}

          {activeRole === "ADMIN" && (
            <button
              type="button"
              onClick={handleCheckUpdates}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black hover:bg-neutral-800 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {actionLoading === "monitor" ? "Detecting..." : "Run Detection"}
            </button>
          )}

          {/* Delete Case button (Admin only) */}
          {activeRole === "ADMIN" && (
            <button
              type="button"
              onClick={handleDeleteCase}
              disabled={actionLoading === "delete"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
              title="Delete this case from tracking"
            >
              {actionLoading === "delete" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>Delete Case</span>
            </button>
          )}
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
                  {formatDateDMY(normalized?.nextHearingDate, "Not Scheduled")}
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
                          {formatDateDMY(h.hearingDate, h.hearingDate || "—")}
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
                          {formatDateDMY(o.orderDate, o.orderDate || "—")}
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
          {/* Contacts Directory Box */}
          <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-black block">
                  WhatsApp Dispatch Directory
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {2 + (caseData.contacts?.length || 0)} recipients configured
                </span>
              </div>
              {activeRole === "ADMIN" && (
                <button
                  type="button"
                  onClick={() => {
                    setContactError(null);
                    setShowAddContactModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black hover:bg-neutral-800 text-white text-[11px] font-semibold transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Contact</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Advocate Contacts */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Advocates & Counsel ({1 + (caseData.contacts?.filter((c) => c.type === "LAWYER").length || 0)})</span>
                </div>

                {/* Primary Lawyer */}
                <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-black font-semibold uppercase text-[10px] bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                      Primary Counsel
                    </span>
                    <span className="font-mono text-emerald-600 text-[10px]">● Registered</span>
                  </div>
                  <div className="font-semibold text-xs text-black mt-1">{caseData.lawyer.name}</div>
                  <div className="font-mono text-xs text-neutral-600">{caseData.lawyer.phone}</div>
                  <a
                    href={`https://wa.me/${caseData.lawyer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Case Update: ${caseData.caseNumber} (CNR: ${caseData.cnr}). Next hearing: ${formatDateDMY(normalized?.nextHearingDate, "Pending")}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-mono text-black hover:underline"
                  >
                    <Send className="w-3 h-3" /> WhatsApp Link
                  </a>
                </div>

                {/* Additional Lawyers */}
                {caseData.contacts
                  ?.filter((c) => c.type === "LAWYER")
                  .map((lawyer) => (
                    <div
                      key={lawyer.id}
                      className="p-3 rounded-md border border-neutral-200 bg-white space-y-1 relative group"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-neutral-700 text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                          {lawyer.role || "Co-Advocate"}
                        </span>
                        {activeRole === "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(lawyer.id)}
                            className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                            title="Remove contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="font-semibold text-xs text-black">{lawyer.name}</div>
                      <div className="font-mono text-xs text-neutral-600">{lawyer.phone}</div>
                      <a
                        href={`https://wa.me/${lawyer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Case Update: ${caseData.caseNumber} (CNR: ${caseData.cnr}). Next hearing: ${formatDateDMY(normalized?.nextHearingDate, "Pending")}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-mono text-black hover:underline"
                      >
                        <Send className="w-3 h-3" /> WhatsApp Link
                      </a>
                    </div>
                  ))}
              </div>

              {/* Client Contacts */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Clients & Litigants ({1 + (caseData.contacts?.filter((c) => c.type === "CLIENT").length || 0)})</span>
                </div>

                {/* Primary Client */}
                <div className="p-3 rounded-md border border-neutral-200 bg-neutral-50 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-black font-semibold uppercase text-[10px] bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                      Primary Litigant
                    </span>
                    <span className="font-mono text-emerald-600 text-[10px]">● Registered</span>
                  </div>
                  <div className="font-semibold text-xs text-black mt-1">{caseData.client.name}</div>
                  <div className="font-mono text-xs text-neutral-600">{caseData.client.whatsappNumber}</div>
                  <a
                    href={`https://wa.me/${caseData.client.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Update from ${caseData.firm?.name || "Counsel"}: Case ${caseData.caseNumber}. Next hearing: ${formatDateDMY(normalized?.nextHearingDate, "Pending")}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-mono text-black hover:underline"
                  >
                    <Send className="w-3 h-3" /> WhatsApp Link
                  </a>
                </div>

                {/* Additional Clients */}
                {caseData.contacts
                  ?.filter((c) => c.type === "CLIENT")
                  .map((client) => (
                    <div
                      key={client.id}
                      className="p-3 rounded-md border border-neutral-200 bg-white space-y-1 relative group"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-neutral-700 text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                          {client.role || "Co-Litigant"}
                        </span>
                        {activeRole === "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(client.id)}
                            className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                            title="Remove contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="font-semibold text-xs text-black">{client.name}</div>
                      <div className="font-mono text-xs text-neutral-600">{client.phone}</div>
                      <a
                        href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Update from ${caseData.firm?.name || "Counsel"}: Case ${caseData.caseNumber}. Next hearing: ${formatDateDMY(normalized?.nextHearingDate, "Pending")}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-mono text-black hover:underline"
                      >
                        <Send className="w-3 h-3" /> WhatsApp Link
                      </a>
                    </div>
                  ))}
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
                {isChamberManual ? "Manual Approval Mode" : "Auto Dispatch Active"}
              </span>
            </div>

            {caseData.events.length > 0 ? (
              <div className="space-y-4">
                {caseData.events.map((ev) => {
                  const isPending = ev.notificationStatus === "PENDING_APPROVAL";

                  return (
                    <div key={ev.id} className="space-y-2 pb-3 border-b border-neutral-100 last:border-b-0">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-black uppercase">
                          {ev.eventType}
                        </span>
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase font-mono">
                              Pending Review
                            </span>
                          )}
                          <span className="text-neutral-400 text-[10px]">
                            {new Date(ev.detectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-700 font-sans leading-snug">
                        {ev.description}
                      </p>

                      {/* If pending review in manual mode, offer lawyer the action to review & send */}
                      {isPending && activeRole === "ADMIN" && (
                        <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-2 text-xs">
                          <span className="text-purple-900 text-[11px]">
                            Held for lawyer approval in Manual mode.
                          </span>
                          <button
                            type="button"
                            onClick={() => openDispatchModal(ev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-800 text-white font-semibold text-[11px] shadow-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit & Dispatch</span>
                          </button>
                        </div>
                      )}

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
                  );
                })}
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

      {/* Manual Dispatch & Message Edit Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl shadow-2xl p-6 space-y-5 text-neutral-900 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Review &amp; Edit WhatsApp Message
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Counsel has full authority to review, adjust language, or customize before sending.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dispatchFeedback && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {dispatchFeedback}
              </div>
            )}

            <form onSubmit={handleSendManualDispatch} className="space-y-5">
              {/* Recipient Checkboxes */}
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="text-xs font-bold text-neutral-900 block">
                  Select Recipients
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-neutral-200 hover:border-neutral-300">
                    <input
                      type="checkbox"
                      checked={sendToClient}
                      onChange={(e) => setSendToClient(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <div className="truncate">
                      <span className="font-semibold block truncate">Client</span>
                      <span className="text-[10px] text-neutral-500 font-mono block truncate">
                        {caseData.client.name}
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-neutral-200 hover:border-neutral-300">
                    <input
                      type="checkbox"
                      checked={sendToLawyer}
                      onChange={(e) => setSendToLawyer(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <div className="truncate">
                      <span className="font-semibold block truncate">Lead Counsel</span>
                      <span className="text-[10px] text-neutral-500 font-mono block truncate">
                        {caseData.lawyer.name}
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-neutral-200 hover:border-neutral-300">
                    <input
                      type="checkbox"
                      checked={sendToContacts}
                      onChange={(e) => setSendToContacts(e.target.checked)}
                      className="rounded text-black focus:ring-black"
                    />
                    <div className="truncate">
                      <span className="font-semibold block truncate">Junior Advocates</span>
                      <span className="text-[10px] text-neutral-500 font-mono block truncate">
                        {caseData.contacts?.length || 0} co-recipients
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Client Message Draft */}
              {sendToClient && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>Client Message Draft</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-normal">
                        Status Note Excluded (Client-Safe)
                      </span>
                    </label>
                  </div>
                  <textarea
                    rows={6}
                    value={clientDraft}
                    onChange={(e) => setClientDraft(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Tip: You can edit dates, add courtroom directions, or customize greeting before sending to the client.
                  </p>
                </div>
              )}

              {/* Lawyer / Junior Advocate Message Draft */}
              {(sendToLawyer || sendToContacts) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>Advocate / Junior Alert Draft</span>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-normal">
                        Includes Full Status &amp; Proceeding Notes
                      </span>
                    </label>
                  </div>
                  <textarea
                    rows={6}
                    value={lawyerDraft}
                    onChange={(e) => setLawyerDraft(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black leading-relaxed"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching || (!sendToClient && !sendToLawyer && !sendToContacts)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending to WhatsApp Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch WhatsApp Update Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                Add Courtroom Contact
              </h3>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contactError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded font-mono">
                {contactError}
              </div>
            )}

            <form onSubmit={handleAddContact} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                  Recipient Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setContactType("LAWYER");
                      setContactRole("Junior Advocate");
                    }}
                    className={`py-2 px-3 rounded border text-xs font-semibold transition-colors ${
                      contactType === "LAWYER"
                        ? "bg-black text-white border-black"
                        : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    Advocate / Counsel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContactType("CLIENT");
                      setContactRole("Co-Petitioner");
                    }}
                    className={`py-2 px-3 rounded border text-xs font-semibold transition-colors ${
                      contactType === "CLIENT"
                        ? "bg-black text-white border-black"
                        : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    Client / Litigant
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={contactType === "LAWYER" ? "e.g. Adv. Nileema Saranga" : "e.g. Soham Saranga"}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                  WhatsApp Number *
                </label>
                <input
                  type="text"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder={contactType === "LAWYER" ? "+91 98506 70809" : "+91 80800 88656"}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-xs font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                  Designation / Role
                </label>
                {contactType === "LAWYER" ? (
                  <select
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded text-xs bg-white focus:outline-none focus:border-black"
                  >
                    <option value="Junior Advocate">Junior Advocate</option>
                    <option value="Briefing Counsel">Briefing Counsel</option>
                    <option value="Associate Advocate">Associate Advocate</option>
                    <option value="Chamber Clerk">Chamber Clerk</option>
                    <option value="Senior Counsel">Senior Counsel</option>
                  </select>
                ) : (
                  <select
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded text-xs bg-white focus:outline-none focus:border-black"
                  >
                    <option value="Co-Petitioner">Co-Petitioner</option>
                    <option value="Co-Respondent">Co-Respondent</option>
                    <option value="Authorized Signatory">Authorized Signatory</option>
                    <option value="Family Member / Heir">Family Member / Heir</option>
                    <option value="Corporate Representative">Corporate Representative</option>
                  </select>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-3.5 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isSubmittingContact ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...
                    </>
                  ) : (
                    "Save Recipient"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-black">
                  Case Status
                </label>
                <select
                  value={simCaseStatus}
                  onChange={(e) => setSimCaseStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="DISPOSED">DISPOSED</option>
                  <option value="ADJOURNED">ADJOURNED</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="simAddOrder"
                  checked={simAddOrder}
                  onChange={(e) => setSimAddOrder(e.target.checked)}
                  className="w-4 h-4 accent-black rounded"
                />
                <label
                  htmlFor="simAddOrder"
                  className="text-xs font-medium text-neutral-800"
                >
                  Attach new judicial order entry
                </label>
              </div>

              {simAddOrder && (
                <div className="space-y-1 pl-6">
                  <label className="block text-[11px] font-mono uppercase text-neutral-500">
                    Order Description
                  </label>
                  <input
                    type="text"
                    value={simOrderDesc}
                    onChange={(e) => setSimOrderDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-3.5 py-1.5 border border-neutral-300 rounded-md text-xs font-mono text-neutral-600 hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "simulate"}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading === "simulate" ? "Simulating..." : "Apply & Detect Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
