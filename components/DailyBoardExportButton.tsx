"use client";

import { useState } from "react";
import { FileText, Download, Calendar, ChevronDown, Check, Loader2 } from "lucide-react";
import { formatDateDMY } from "@/lib/whatsapp/date-formatter";

interface DailyBoardExportButtonProps {
  firmId?: string;
  className?: string;
  variant?: "primary" | "secondary";
  defaultDate?: string; // YYYY-MM-DD
}

function getTodayIST(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  return ist.toISOString().split("T")[0];
}

function getTomorrowIST(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5 + 86400000);
  return ist.toISOString().split("T")[0];
}

export function DailyBoardExportButton({
  firmId,
  className = "",
  variant = "secondary",
  defaultDate,
}: DailyBoardExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [customDate, setCustomDate] = useState(defaultDate || getTodayIST());

  const todayStr = getTodayIST();
  const tomorrowStr = getTomorrowIST();

  const handleDownload = (dateStr: string) => {
    setIsDownloading(true);
    setIsOpen(false);

    const params = new URLSearchParams();
    params.set("date", dateStr);
    if (firmId) params.set("firmId", firmId);

    const downloadUrl = `/api/calendar/daily-board?${params.toString()}`;

    // Create temporary link and trigger download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `Daily_Board_${dateStr}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1200);
  };

  const buttonClasses =
    variant === "primary"
      ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
      : "bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-semibold shadow-xs";

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <div className="inline-flex rounded-md shadow-xs">
        {/* Main Action Button - Downloads for currently chosen or today's date */}
        <button
          type="button"
          onClick={() => handleDownload(defaultDate || todayStr)}
          disabled={isDownloading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-l-md transition-colors ${buttonClasses}`}
          title="Download Daily Board in Word (.docx) format"
        >
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span>
            {defaultDate
              ? `Daily Board (${formatDateDMY(defaultDate)}) .docx`
              : "Download Daily Board (.docx)"}
          </span>
        </button>

        {/* Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-2 py-1.5 text-xs rounded-r-md border-l border-neutral-200 hover:bg-neutral-100 transition-colors ${buttonClasses}`}
          title="Choose date for Daily Board"
        >
          <ChevronDown className="w-3 h-3 text-neutral-500" />
        </button>
      </div>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-64 rounded-md bg-white border border-neutral-200 shadow-lg z-50 py-1 text-xs text-neutral-800 divide-y divide-neutral-100">
            <div className="px-3 py-2 bg-neutral-50 text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
              Export Word Daily Board
            </div>

            {/* Today */}
            <button
              type="button"
              onClick={() => handleDownload(todayStr)}
              className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-medium text-black">Today's Board</span>
              </div>
              <span className="font-mono text-[11px] text-neutral-500">
                {formatDateDMY(todayStr)}
              </span>
            </button>

            {/* Tomorrow */}
            <button
              type="button"
              onClick={() => handleDownload(tomorrowStr)}
              className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-blue-900">Tomorrow's Board</span>
              </div>
              <span className="font-mono text-[11px] text-neutral-500">
                {formatDateDMY(tomorrowStr)}
              </span>
            </button>

            {/* Custom Date Picker */}
            <div className="p-3 bg-neutral-50/70 space-y-2">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Custom Listing Date:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-neutral-300 rounded bg-white text-black font-mono focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => handleDownload(customDate)}
                  className="px-2.5 py-1 text-xs bg-black text-white font-medium rounded hover:bg-neutral-800 shrink-0"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
