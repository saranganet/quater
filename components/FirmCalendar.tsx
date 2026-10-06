"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  UserCheck,
  UserPlus,
  Building2,
  Gavel,
  Clock,
  Search,
  Printer,
  Filter,
  ArrowUpRight,
  Check,
  Phone,
  MapPin,
  AlertCircle,
  X,
  Share2,
  Send,
  MessageSquare,
} from "lucide-react";

interface Lawyer {
  id: string;
  name: string;
  phone: string;
}

interface Firm {
  id: string;
  name: string;
  slug: string;
  leadAdvocate?: string | null;
  contactPhone?: string | null;
  clientMessageIntro?: string | null;
}

interface CaseItem {
  id: string;
  cnr: string;
  courtName: string;
  caseNumber: string;
  filingYear?: string | null;
  firmId?: string | null;
  firm?: Firm | null;
  lawyer: Lawyer;
  client: {
    id: string;
    name: string;
    whatsappNumber: string;
  };
  snapshots: Array<{
    importantFields: any;
    rawData?: any;
    createdAt: string;
  }>;
}

interface FirmCalendarProps {
  initialCases: CaseItem[];
  firms: Firm[];
  initialLawyers: Lawyer[];
}

export function FirmCalendar({
  initialCases,
  firms,
  initialLawyers,
}: FirmCalendarProps) {
  const [cases, setCases] = useState<CaseItem[]>(initialCases);
  const [lawyers, setLawyers] = useState<Lawyer[]>(initialLawyers);

  // Filters
  const [selectedFirmId, setSelectedFirmId] = useState<string>("all");
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");

  // Determine earliest upcoming hearing date for default month
  const initialDate = useMemo(() => {
    for (const c of initialCases) {
      const nextDate = c.snapshots?.[0]?.importantFields?.nextHearingDate;
      if (nextDate) {
        const parsed = new Date(nextDate + "T00:00:00");
        if (!isNaN(parsed.getTime())) {
          return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        }
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [initialCases]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Assignment Modal State
  const [assigningCase, setAssigningCase] = useState<CaseItem | null>(null);
  const [assignMode, setAssignMode] = useState<"existing" | "new">("existing");
  const [targetLawyerId, setTargetLawyerId] = useState<string>("");
  const [newLawyerName, setNewLawyerName] = useState<string>("");
  const [newLawyerPhone, setNewLawyerPhone] = useState<string>("");
  const [targetFirmId, setTargetFirmId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // WhatsApp Assignment Dispatch State
  const [notifyWhatsApp, setNotifyWhatsApp] = useState<boolean>(true);
  const [briefingNotes, setBriefingNotes] = useState<string>("");
  const [assignedWhatsAppResult, setAssignedWhatsAppResult] = useState<{
    sent: boolean;
    recipient: string;
    phone: string;
    directUrl: string;
    error?: string;
  } | null>(null);

  // Map hearings by date string (YYYY-MM-DD)
  const hearingsByDate = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        caseItem: CaseItem;
        hearingDate: string;
        stage: string;
        judge?: string;
        purpose?: string;
        isPrimaryNext: boolean;
      }>
    >();

    cases.forEach((c) => {
      // Check firm filter
      if (selectedFirmId !== "all") {
        if (selectedFirmId === "unassigned") {
          if (c.firmId) return;
        } else if (c.firmId !== selectedFirmId) {
          return;
        }
      }

      // Check lawyer filter
      if (selectedLawyerId !== "all" && c.lawyer.id !== selectedLawyerId) {
        return;
      }

      // Check search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesCnr = c.cnr.toLowerCase().includes(query);
        const matchesCaseNo = c.caseNumber.toLowerCase().includes(query);
        const matchesCourt = c.courtName.toLowerCase().includes(query);
        const matchesLawyer = c.lawyer.name.toLowerCase().includes(query);
        const matchesClient = c.client.name.toLowerCase().includes(query);
        const snapshot = c.snapshots?.[0]?.importantFields;
        const matchesPetitioner = snapshot?.petitioners?.some((p: string) =>
          p.toLowerCase().includes(query)
        );
        const matchesRespondent = snapshot?.respondents?.some((r: string) =>
          r.toLowerCase().includes(query)
        );

        if (
          !matchesCnr &&
          !matchesCaseNo &&
          !matchesCourt &&
          !matchesLawyer &&
          !matchesClient &&
          !matchesPetitioner &&
          !matchesRespondent
        ) {
          return;
        }
      }

      const snapshot = c.snapshots?.[0]?.importantFields;
      const nextHearing = snapshot?.nextHearingDate;
      const stage = snapshot?.stage || "Hearing";
      const judge = snapshot?.latestHearing?.judge || snapshot?.judges?.[0];
      const purpose = snapshot?.latestHearing?.purposeOfListing || stage;

      if (nextHearing && /^\d{4}-\d{2}-\d{2}$/.test(nextHearing)) {
        if (!map.has(nextHearing)) {
          map.set(nextHearing, []);
        }
        map.get(nextHearing)!.push({
          caseItem: c,
          hearingDate: nextHearing,
          stage,
          judge,
          purpose,
          isPrimaryNext: true,
        });
      }
    });

    return map;
  }, [cases, selectedFirmId, selectedLawyerId, searchQuery]);

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 0 = Sunday, 1 = Monday, etc. Indian / ISO week starts on Monday
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hearings: Array<any>;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split("T")[0];
      days.push({
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hearings: hearingsByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hearings: hearingsByDate.get(dateStr) || [],
      });
    }

    // Next month padding to fill 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split("T")[0];
      days.push({
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hearings: hearingsByDate.get(dateStr) || [],
      });
    }

    return days;
  }, [currentMonth, hearingsByDate]);

  // Selected date's hearings or upcoming list
  const activeHearings = useMemo(() => {
    if (selectedDate && hearingsByDate.has(selectedDate)) {
      return hearingsByDate.get(selectedDate)!;
    }

    // If no specific date selected, collect all hearings and sort by date ascending
    const all: Array<{
      caseItem: CaseItem;
      hearingDate: string;
      stage: string;
      judge?: string;
      purpose?: string;
      isPrimaryNext: boolean;
    }> = [];

    hearingsByDate.forEach((list) => {
      all.push(...list);
    });

    return all.sort((a, b) => a.hearingDate.localeCompare(b.hearingDate));
  }, [selectedDate, hearingsByDate]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today.toISOString().split("T")[0]);
  };

  // Open assignment modal
  const openAssignmentModal = (caseItem: CaseItem) => {
    setAssigningCase(caseItem);
    setTargetLawyerId(caseItem.lawyer.id);
    setTargetFirmId(caseItem.firmId || "");
    setAssignMode("existing");
    setNewLawyerName("");
    setNewLawyerPhone("");
    setNotifyWhatsApp(true);
    setBriefingNotes("");
    setAssignedWhatsAppResult(null);
    setFeedbackMsg(null);
  };

  // Save assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningCase) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const payload: any = {
        firmId: targetFirmId || null,
        notifyWhatsApp,
        briefingNotes: briefingNotes.trim() || undefined,
      };

      if (assignMode === "existing") {
        if (!targetLawyerId) {
          throw new Error("Please select an advocate.");
        }
        payload.lawyerId = targetLawyerId;
      } else {
        if (!newLawyerName.trim()) {
          throw new Error("Please enter advocate name.");
        }
        if (!newLawyerPhone.trim()) {
          throw new Error("Please enter advocate phone number.");
        }
        payload.lawyerName = newLawyerName.trim();
        payload.lawyerPhone = newLawyerPhone.trim();
      }

      const res = await fetch(`/api/cases/${assigningCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update assignment.");
      }

      const updatedCase: CaseItem = data.case;

      // Update local cases state
      setCases((prev) =>
        prev.map((c) => (c.id === updatedCase.id ? { ...c, ...updatedCase } : c))
      );

      // If new lawyer was created, update lawyers list
      if (updatedCase.lawyer && !lawyers.some((l) => l.id === updatedCase.lawyer.id)) {
        setLawyers((prev) => [...prev, updatedCase.lawyer]);
      }

      if (data.whatsappNotification) {
        setAssignedWhatsAppResult(data.whatsappNotification);
      }

      setFeedbackMsg({
        text: `Assigned successfully to ${updatedCase.lawyer.name}${
          data.whatsappNotification?.sent ? " · WhatsApp dispatch sent!" : ""
        }`,
        type: "success",
      });

      // Keep modal open if WhatsApp link available so user can view or click
      if (!data.whatsappNotification) {
        setTimeout(() => {
          setAssigningCase(null);
          setFeedbackMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Currently selected firm object
  const currentFirm = firms.find((f) => f.id === selectedFirmId);

  // Month Title string (e.g. November 2026)
  const monthTitle = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-neutral-400">
            <span>Firm Diary Management</span>
            <span>·</span>
            <span>eCourts Cause List</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black mt-1 flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-black" />
            Court Hearings & Advocate Assignment
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl font-sans">
            Interactive daily cause list and hearing schedule. Track courtroom listings, judge diary dates, and assign argue/brief advocates across firm matters.
          </p>
        </div>

        {/* Action Controls & Cause List Print */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold shadow-xs transition-colors"
            title="Print daily cause list"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-500" />
            Print Cause List
          </button>

          <Link
            href="/cases/new"
            className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Track New Matter
          </Link>
        </div>
      </div>

      {/* Firm & Advocate Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Firm Selector */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-neutral-400" />
              Law Firm / Practice
            </label>
            <select
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className="w-full text-xs font-medium border border-neutral-300 rounded-md px-3 py-2 bg-white text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-black"
            >
              <option value="all">All Law Firms & Practices</option>
              {firms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
              <option value="unassigned">Direct / Independent Practice</option>
            </select>
          </div>

          {/* Assigned Advocate Selector */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3 text-neutral-400" />
              Assigned Advocate
            </label>
            <select
              value={selectedLawyerId}
              onChange={(e) => setSelectedLawyerId(e.target.value)}
              className="w-full text-xs font-medium border border-neutral-300 rounded-md px-3 py-2 bg-white text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-black"
            >
              <option value="all">All Advocates ({lawyers.length})</option>
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search CNR / Party / Court */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1">
              <Search className="w-3 h-3 text-neutral-400" />
              Search Matter
            </label>
            <input
              type="text"
              placeholder="CNR, Case No, Party, Court..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-neutral-300 rounded-md px-3 py-2 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-black"
            />
          </div>

          {/* View Mode Toggle */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-400" />
              Layout View
            </label>
            <div className="grid grid-cols-2 gap-1 p-0.5 border border-neutral-200 rounded-md bg-neutral-100">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`text-xs py-1.5 font-medium rounded transition-colors ${
                  viewMode === "calendar"
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Month Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("agenda")}
                className={`text-xs py-1.5 font-medium rounded transition-colors ${
                  viewMode === "agenda"
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Cause List
              </button>
            </div>
          </div>
        </div>

        {/* Selected Firm Lead Advocate Callout */}
        {currentFirm && (
          <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-black">{currentFirm.name}</span>
              {currentFirm.leadAdvocate && (
                <span className="text-neutral-500 font-mono text-[11px]">
                  · Lead: {currentFirm.leadAdvocate}
                </span>
              )}
              {currentFirm.contactPhone && (
                <span className="text-neutral-400 font-mono text-[11px]">
                  ({currentFirm.contactPhone})
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-neutral-500">
              {hearingsByDate.size} hearing date(s) scheduled
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Calendar on Left/Top + Cause List on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar View Column */}
        {viewMode === "calendar" && (
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            {/* Calendar Month Header */}
            <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-black uppercase tracking-wider font-mono">
                  {monthTitle}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                  {calendarDays.reduce((acc, d) => acc + d.hearings.length, 0)} Hearings
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-mono font-medium rounded hover:bg-neutral-200 text-neutral-700 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50/50 text-[11px] font-mono font-semibold uppercase text-neutral-500 text-center py-2.5">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span className="text-neutral-400">Sat</span>
              <span className="text-neutral-400">Sun</span>
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-neutral-100 bg-neutral-50/30">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedDate === day.dateString;
                const hasHearings = day.hearings.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasHearings || isSelected) {
                        setSelectedDate(isSelected ? null : day.dateString);
                      } else {
                        setSelectedDate(day.dateString);
                      }
                    }}
                    className={`min-h-[92px] sm:min-h-[105px] p-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                      day.isCurrentMonth ? "bg-white" : "bg-neutral-50/80 text-neutral-400"
                    } ${
                      isSelected
                        ? "ring-2 ring-black bg-neutral-50 z-10"
                        : "hover:bg-neutral-50/80"
                    }`}
                  >
                    {/* Date Number & Indicator */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-medium rounded-full w-6 h-6 flex items-center justify-center ${
                          day.isToday
                            ? "bg-black text-white font-bold"
                            : isSelected
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-700"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {hasHearings && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      )}
                    </div>

                    {/* Hearing Listing Pills inside Cell */}
                    <div className="space-y-1 mt-1.5 flex-1">
                      {day.hearings.slice(0, 2).map((h, hIdx) => (
                        <div
                          key={hIdx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono leading-tight bg-neutral-900 text-white truncate shadow-xs flex items-center justify-between gap-1"
                          title={`${h.caseItem.cnr} - ${h.purpose} (${h.caseItem.lawyer.name})`}
                        >
                          <span className="truncate">{h.purpose || h.stage}</span>
                          <span className="text-[9px] text-neutral-300 font-sans shrink-0">
                            {h.caseItem.lawyer.name.split(" ")[0]}
                          </span>
                        </div>
                      ))}

                      {day.hearings.length > 2 && (
                        <div className="text-[9px] font-mono text-neutral-500 font-medium px-1">
                          +{day.hearings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Helper Footer */}
            <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-[11px] font-mono text-neutral-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Scheduled Listing
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-black" />
                  Today
                </span>
              </div>
              <span>Click any date to filter cause list</span>
            </div>
          </div>
        )}

        {/* Cause List / Matters Column */}
        <div
          className={`${
            viewMode === "calendar" ? "lg:col-span-5" : "lg:col-span-12"
          } space-y-4`}
        >
          {/* Cause List Header Card */}
          <div className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                {selectedDate ? "Filtered Cause List" : "Upcoming Cause List"}
              </div>
              <h2 className="text-base font-bold text-black mt-0.5">
                {selectedDate
                  ? `Court Diary: ${new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}`
                  : "All Scheduled Hearings"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                {activeHearings.length} {activeHearings.length === 1 ? "matter" : "matters"}
              </span>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-mono text-neutral-500 hover:text-black underline px-1"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {/* Listings List */}
          {activeHearings.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-10 text-center space-y-2">
              <p className="text-sm font-mono text-neutral-500">
                No court hearings found for this selection.
              </p>
              <p className="text-xs text-neutral-400">
                Try selecting another date or clearing the firm/advocate filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeHearings.map(({ caseItem, hearingDate, stage, judge, purpose }, idx) => {
                const snapshot = caseItem.snapshots?.[0]?.importantFields;
                const petitioner = snapshot?.petitioners?.[0] || "Petitioner";
                const respondent = snapshot?.respondents?.[0] || "Respondent";

                return (
                  <div
                    key={`${caseItem.id}-${hearingDate}-${idx}`}
                    className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs hover:border-neutral-300 transition-all space-y-3"
                  >
                    {/* Top Row: Hearing Date Badge + Stage */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-900 text-white">
                            {hearingDate}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-neutral-100 border border-neutral-200 text-neutral-800">
                            {purpose || stage}
                          </span>
                          {caseItem.firm && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-600 bg-neutral-50 border border-neutral-200 hidden sm:inline">
                              {caseItem.firm.name}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/cases/${caseItem.id}`}
                          className="font-mono font-bold text-sm text-black hover:underline mt-1.5 block group"
                        >
                          {caseItem.cnr}
                          <ArrowUpRight className="inline-block w-3.5 h-3.5 ml-1 text-neutral-400 group-hover:text-black" />
                        </Link>
                      </div>

                      {/* Assign Advocate Button */}
                      <button
                        type="button"
                        onClick={() => openAssignmentModal(caseItem)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-black text-xs font-semibold shadow-xs transition-colors shrink-0"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-black" />
                        Assign Advocate
                      </button>
                    </div>

                    {/* Parties & Court */}
                    <div className="text-xs space-y-1 text-neutral-700 bg-neutral-50/70 p-2.5 rounded border border-neutral-100">
                      <div className="font-medium text-black">
                        {petitioner} <span className="text-neutral-400 italic font-normal">v.</span> {respondent}
                      </div>
                      <div className="text-[11px] text-neutral-600 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 font-mono">
                          <Gavel className="w-3 h-3 text-neutral-400" />
                          {caseItem.courtName}
                        </span>
                        {judge && (
                          <span className="text-neutral-400 font-mono">· {judge}</span>
                        )}
                      </div>
                    </div>

                    {/* Assigned Advocate & Client Contacts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-neutral-100 text-xs">
                      {/* Assigned Advocate */}
                      <div className="flex items-center justify-between bg-neutral-100/60 px-2.5 py-1.5 rounded">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <div className="truncate">
                            <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                              Assigned Advocate
                            </span>
                            <span className="font-semibold text-black truncate block">
                              {caseItem.lawyer.name}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 shrink-0 ml-1">
                          {caseItem.lawyer.phone}
                        </span>
                      </div>

                      {/* Client */}
                      <div className="flex items-center justify-between bg-neutral-100/60 px-2.5 py-1.5 rounded">
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <div className="truncate">
                            <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                              Litigant / Client
                            </span>
                            <span className="font-semibold text-black truncate block">
                              {caseItem.client.name}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 shrink-0 ml-1">
                          {caseItem.client.whatsappNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Advocate Assignment Modal */}
      {assigningCase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                  Firm Diary Assignment
                </span>
                <h3 className="text-sm font-bold text-black mt-0.5">
                  Assign Advocate to Matter
                </h3>
              </div>
              <button
                onClick={() => setAssigningCase(null)}
                className="text-neutral-400 hover:text-black p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Matter Summary */}
            <div className="p-4 bg-neutral-50/50 border-b border-neutral-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-400">CNR:</span>
                <span className="font-bold text-black">{assigningCase.cnr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Court:</span>
                <span className="text-neutral-700 truncate max-w-[200px]">
                  {assigningCase.courtName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Next Hearing:</span>
                <span className="font-bold text-black">
                  {assigningCase.snapshots?.[0]?.importantFields?.nextHearingDate || "Pending"}
                </span>
              </div>
            </div>

            {/* Assignment Form */}
            <form onSubmit={handleSaveAssignment} className="p-5 space-y-4 text-xs">
              {/* Assign Mode Tabs */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                  Select Advocate
                </label>
                <div className="grid grid-cols-2 gap-1 p-0.5 border border-neutral-200 rounded-md bg-neutral-100">
                  <button
                    type="button"
                    onClick={() => setAssignMode("existing")}
                    className={`py-1.5 font-medium rounded transition-colors ${
                      assignMode === "existing"
                        ? "bg-white text-black font-semibold shadow-xs"
                        : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    Firm Roster ({lawyers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode("new")}
                    className={`py-1.5 font-medium rounded transition-colors ${
                      assignMode === "new"
                        ? "bg-white text-black font-semibold shadow-xs"
                        : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    + Add New Advocate
                  </button>
                </div>
              </div>

              {/* Mode 1: Select Existing */}
              {assignMode === "existing" ? (
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">
                    Choose Advocate from Roster
                  </label>
                  <select
                    value={targetLawyerId}
                    onChange={(e) => setTargetLawyerId(e.target.value)}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 bg-white text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-black"
                  >
                    {lawyers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Mode 2: Add New Advocate */
                <div className="space-y-3">
                  <div>
                    <label className="block text-neutral-700 font-medium mb-1">
                      Advocate Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Adv. Rohan Deshmukh"
                      value={newLawyerName}
                      onChange={(e) => setNewLawyerName(e.target.value)}
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 bg-white text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-black"
                      required={assignMode === "new"}
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-700 font-medium mb-1">
                      Advocate WhatsApp / Mobile Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+919820011223"
                      value={newLawyerPhone}
                      onChange={(e) => setNewLawyerPhone(e.target.value)}
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 bg-white text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-black"
                      required={assignMode === "new"}
                    />
                  </div>
                </div>
              )}

              {/* Firm Association */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                  Assign to Law Firm
                </label>
                <select
                  value={targetFirmId}
                  onChange={(e) => setTargetFirmId(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 bg-white text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-black"
                >
                  <option value="">No Law Firm (Direct Practice)</option>
                  {firms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* WhatsApp Briefing Dispatch Options */}
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyWhatsApp}
                    onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                    className="rounded border-neutral-300 text-black focus:ring-black w-4 h-4"
                  />
                  <span className="font-semibold text-black flex items-center gap-1.5 text-xs">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Send Automated WhatsApp Briefing to Assigned Advocate
                  </span>
                </label>

                {notifyWhatsApp && (
                  <div className="space-y-1 pl-6">
                    <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                      Briefing Instructions / Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={briefingNotes}
                      onChange={(e) => setBriefingNotes(e.target.value)}
                      placeholder="e.g. Lead counsel will appear at 11:30 AM. Please keep cause list and interim injunction order ready."
                      className="w-full p-2 border border-neutral-300 rounded text-xs bg-white focus:outline-none focus:border-black"
                    />
                  </div>
                )}
              </div>

              {/* Feedback Alert & WhatsApp Result */}
              {feedbackMsg && (
                <div className="space-y-2">
                  <div
                    className={`p-3 rounded text-xs flex items-center gap-2 ${
                      feedbackMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {feedbackMsg.type === "success" ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{feedbackMsg.text}</span>
                  </div>

                  {assignedWhatsAppResult && (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] font-mono text-neutral-600">
                        {assignedWhatsAppResult.sent ? (
                          <span className="text-emerald-700 font-semibold">
                            ✅ Dispatched to WhatsApp (+{assignedWhatsAppResult.phone})
                          </span>
                        ) : (
                          <span className="text-amber-700">
                            ⚠️ Gateway pending dispatch ({assignedWhatsAppResult.error || "Gateway offline"}). Use direct link below:
                          </span>
                        )}
                      </div>
                      <a
                        href={assignedWhatsAppResult.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Open WhatsApp Chat</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setAssigningCase(null)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-medium"
                >
                  {assignedWhatsAppResult ? "Close" : "Cancel"}
                </button>
                {!assignedWhatsAppResult && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-black text-white hover:bg-neutral-800 font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>Saving & Dispatching...</>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Confirm Assignment
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
