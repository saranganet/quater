"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Gavel,
  Loader2,
  X,
  Edit3,
  Calendar,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { formatDateDMY } from "@/lib/whatsapp/date-formatter";

interface ReminderItem {
  caseId: string;
  cnr: string;
  caseNumber: string;
  courtName: string;
  stage: string;
  nextHearingDate: string;
  formattedHearingDate: string;
  clientName: string;
  clientPhone: string;
  assignedAdvocate: string;
  alreadySent: boolean;
  sentAt?: string | null;
  suggestedMessage: string;
}

interface RemindersResponse {
  targetDate: string;
  formattedDate: string;
  totalListed: number;
  sentCount: number;
  pendingCount: number;
  matters: ReminderItem[];
}

export function HearingRemindersWidget({
  activeRole = "ADMIN",
}: {
  activeRole?: "ADMIN" | "JUNIOR";
}) {
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Custom dispatch state
  const [activeItem, setActiveItem] = useState<ReminderItem | null>(null);
  const [customDraft, setCustomDraft] = useState<string>("");
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isBulkDispatching, setIsBulkDispatching] = useState<boolean>(false);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cases/reminders");
      if (!res.ok) {
        throw new Error("Failed to load hearing reminders");
      }
      const json: RemindersResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const openPreviewModal = (item: ReminderItem) => {
    setActiveItem(item);
    setCustomDraft(item.suggestedMessage);
    setDispatchFeedback(null);
  };

  const handleDispatchSingle = async () => {
    if (!activeItem) return;
    setIsDispatching(true);
    setDispatchFeedback(null);

    try {
      const res = await fetch("/api/cases/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: activeItem.caseId,
          date: activeItem.nextHearingDate,
          customMessage: customDraft,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to dispatch reminder");
      }

      setDispatchFeedback({
        type: "success",
        text: `Reminder dispatched to ${activeItem.clientName} (${activeItem.clientPhone})!`,
      });

      // Update state locally and re-fetch
      setTimeout(() => {
        setActiveItem(null);
        fetchReminders();
      }, 1000);
    } catch (err: any) {
      setDispatchFeedback({
        type: "error",
        text: err.message || "Dispatch failed",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleBulkDispatch = async () => {
    if (!data || data.pendingCount === 0) return;
    const confirmSend = window.confirm(
      `Dispatch hearing reminders for tomorrow (${data.formattedDate}) to all ${data.pendingCount} pending clients?`
    );
    if (!confirmSend) return;

    setIsBulkDispatching(true);
    try {
      const res = await fetch("/api/cases/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: true,
          date: data.targetDate,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Bulk dispatch failed");
      }

      await fetchReminders();
    } catch (err: any) {
      alert("Bulk dispatch error: " + err.message);
    } finally {
      setIsBulkDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
          <span className="text-xs font-mono text-neutral-500">
            Checking hearings scheduled for tomorrow...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  // If no cases tomorrow
  if (data.totalListed === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-black flex items-center gap-1.5">
              <span>Tomorrow's Hearings: All Clear ({data.formattedDate})</span>
            </div>
            <p className="text-[11px] text-neutral-500 font-sans">
              No matters listed for tomorrow. 1-day-prior reminders will automatically prompt when hearings are scheduled.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-50 px-2 py-1 rounded border border-neutral-200 self-start sm:self-auto">
          0 Hearings Tomorrow
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Widget Header */}
      <div className="p-4 sm:p-5 bg-neutral-50/80 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-black">
                Tomorrow's Hearings: Client Date Reminders
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                {data.formattedDate}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-sans">
              Prompt litigants 1 day prior with courtroom, hearing time, stage, and documents notice.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-neutral-600 bg-white px-2 py-1 rounded border border-neutral-200">
            <strong className="text-black">{data.sentCount}</strong> / {data.totalListed} Reminded
          </span>

          {activeRole === "ADMIN" && data.pendingCount > 0 && (
            <button
              type="button"
              onClick={handleBulkDispatch}
              disabled={isBulkDispatching}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs disabled:opacity-50"
            >
              {isBulkDispatching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>Remind All ({data.pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Matters List */}
      <div className="divide-y divide-neutral-100">
        {data.matters.map((m) => (
          <div
            key={m.caseId}
            className="p-4 hover:bg-neutral-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            {/* Case & Litigant Details */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-black text-[13px]">
                  {m.caseNumber}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200">
                  {m.cnr}
                </span>
                <span className="text-[10px] font-mono font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {m.stage}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-600 font-sans text-xs">
                <span className="flex items-center gap-1">
                  <Gavel className="w-3 h-3 text-neutral-400" />
                  {m.courtName}
                </span>
                <span className="flex items-center gap-1 font-medium text-neutral-900">
                  <User className="w-3 h-3 text-neutral-400" />
                  Client: {m.clientName}
                </span>
                <span className="font-mono text-[11px] text-neutral-500">
                  {m.clientPhone}
                </span>
              </div>
            </div>

            {/* Actions / Status */}
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              {m.alreadySent ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Reminder Sent</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Pending</span>
                </span>
              )}

              {activeRole === "ADMIN" && (
                <button
                  type="button"
                  onClick={() => openPreviewModal(m)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-semibold shadow-xs transition-colors"
                >
                  <Send className="w-3 h-3 text-blue-600" />
                  <span>{m.alreadySent ? "Resend Reminder" : "Send WhatsApp Reminder"}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review & Custom Edit Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 font-bold block">
                  1-Day-Prior Hearing Reminder
                </span>
                <h3 className="text-sm font-bold text-black mt-0.5">
                  Review & Dispatch to {activeItem.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="text-neutral-400 hover:text-black p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Matter Target Card */}
            <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-400">Case No:</span>
                <span className="font-bold text-black">{activeItem.caseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Courtroom:</span>
                <span className="text-neutral-700">{activeItem.courtName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Hearing Date:</span>
                <span className="font-bold text-blue-800">
                  {activeItem.formattedHearingDate} (Tomorrow)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Recipient Client:</span>
                <span className="font-medium text-black">
                  {activeItem.clientName} ({activeItem.clientPhone})
                </span>
              </div>
            </div>

            {/* Draft Message Editor */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> WhatsApp Message Body (Editable)
                </label>
                <span className="text-[10px] font-mono text-neutral-400">
                  Preview exactly as sent
                </span>
              </div>

              <textarea
                rows={9}
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                className="w-full p-3 font-mono text-xs border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black leading-relaxed"
              />

              {dispatchFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono border ${
                    dispatchFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {dispatchFeedback.text}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                disabled={isDispatching}
                className="px-3.5 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-medium rounded-md hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchSingle}
                disabled={isDispatching || !customDraft.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch to Client WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
