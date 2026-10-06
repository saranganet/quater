"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Users,
  Building2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  UserPlus,
} from "lucide-react";

interface AttendanceMember {
  memberId: string;
  name: string;
  phone: string;
  role: "ADMIN" | "JUNIOR";
  title: string;
  date: string;
  recordId: string | null;
  status: "PRESENT" | "IN_COURT" | "ON_LEAVE" | "ABSENT" | "UNMARKED";
  notes: string;
  updatedAt: string | null;
}

interface AttendanceStats {
  total: number;
  present: number;
  inCourt: number;
  onLeave: number;
  absent: number;
  unmarked: number;
}

function getTodayIST(): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const dd = String(ist.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [yyyy, mm, dd] = dateStr.split("-");
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST());
  const [members, setMembers] = useState<AttendanceMember[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [activeFirm, setActiveFirm] = useState<any>(null);
  const [activeRole, setActiveRole] = useState<"ADMIN" | "JUNIOR">("ADMIN");
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadData = async (date: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      // 1. Fetch active session
      const authRes = await fetch("/api/auth/firm");
      const authData = await authRes.json();
      if (authData.activeFirm) setActiveFirm(authData.activeFirm);
      if (authData.activeRole) setActiveRole(authData.activeRole);
      if (authData.activeMemberId) setActiveMemberId(authData.activeMemberId);

      // 2. Fetch attendance
      const attRes = await fetch(`/api/attendance?date=${date}`);
      if (!attRes.ok) {
        throw new Error("Failed to load attendance records");
      }
      const attData = await attRes.json();
      setMembers(attData.members || []);
      setStats(attData.stats || null);
    } catch (err: any) {
      console.error("Error loading attendance:", err);
      setFeedback({ message: err.message || "Failed to load attendance", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const handleDateShift = (days: number) => {
    const [yyyy, mm, dd] = selectedDate.split("-");
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    d.setDate(d.getDate() + days);
    const newYyyy = d.getFullYear();
    const newMm = String(d.getMonth() + 1).padStart(2, "0");
    const newDd = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${newYyyy}-${newMm}-${newDd}`);
  };

  const updateMemberStatus = async (memberId: string, status: string, notes?: string) => {
    setSavingMemberId(memberId);
    setFeedback(null);
    try {
      const currentMember = members.find((m) => m.memberId === memberId);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          memberId,
          status,
          notes: notes !== undefined ? notes : currentMember?.notes || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update attendance");

      // Update local state smoothly
      setMembers((prev) =>
        prev.map((m) =>
          m.memberId === memberId
            ? { ...m, status: status as any, notes: notes !== undefined ? notes : m.notes }
            : m
        )
      );

      // Recalculate stats
      setStats((prev) => {
        if (!prev) return null;
        const updatedList = members.map((m) =>
          m.memberId === memberId ? { ...m, status: status as any } : m
        );
        return {
          total: updatedList.length,
          present: updatedList.filter((m) => m.status === "PRESENT").length,
          inCourt: updatedList.filter((m) => m.status === "IN_COURT").length,
          onLeave: updatedList.filter((m) => m.status === "ON_LEAVE").length,
          absent: updatedList.filter((m) => m.status === "ABSENT").length,
          unmarked: updatedList.filter((m) => m.status === "UNMARKED").length,
        };
      });

      setFeedback({ message: data.message || "Attendance updated", type: "success" });
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (activeRole === "JUNIOR") return;
    setBulkSaving(true);
    setFeedback(null);
    try {
      for (const m of members) {
        if (m.status !== "PRESENT") {
          await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: selectedDate,
              memberId: m.memberId,
              status: "PRESENT",
              notes: m.notes || "",
            }),
          });
        }
      }
      await loadData(selectedDate);
      setFeedback({ message: "All chamber advocates marked PRESENT for this date.", type: "success" });
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to mark all present", type: "error" });
    } finally {
      setBulkSaving(false);
    }
  };

  const canEditMember = (member: AttendanceMember) => {
    if (activeRole === "ADMIN") return true;
    // Junior can only edit their own attendance if their memberId matches
    return activeMemberId === member.memberId;
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>{activeFirm?.name || "Chamber Daily Attendance"}</span>
            <span>•</span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeRole === "ADMIN"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {activeRole === "ADMIN" ? "Admin (Lead Lawyer)" : "Junior (View-Only / Self)"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Chamber Daily Attendance Sheet
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track daily presence, court appearances, and leave for lead advocates and junior lawyers.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-white shadow-sm p-1">
            <button
              onClick={() => handleDateShift(-1)}
              className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(getTodayIST())}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                selectedDate === getTodayIST()
                  ? "bg-black text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateShift(1)}
              className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-neutral-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Date Banner & Roster Stats */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-black">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Attendance Date
              </div>
              <div className="text-lg font-bold text-neutral-900">
                {formatDateDisplay(selectedDate)}
              </div>
            </div>
          </div>

          {activeRole === "ADMIN" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllPresent}
                disabled={bulkSaving || loading || members.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {bulkSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Mark All Present</span>
              </button>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-neutral-500" />
                <span>Manage Chamber Roster</span>
              </Link>
            </div>
          )}
        </div>

        {/* Stats Pill Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-neutral-100">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100">
              <div className="text-[11px] font-mono text-neutral-500 uppercase">Total Advocates</div>
              <div className="text-xl font-bold text-neutral-900 mt-0.5">{stats.total}</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <div className="text-[11px] font-mono text-emerald-700 uppercase">Present</div>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">{stats.present}</div>
            </div>
            <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-100">
              <div className="text-[11px] font-mono text-sky-700 uppercase">In Court</div>
              <div className="text-xl font-bold text-sky-700 mt-0.5">{stats.inCourt}</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100">
              <div className="text-[11px] font-mono text-amber-700 uppercase">On Leave</div>
              <div className="text-xl font-bold text-amber-700 mt-0.5">{stats.onLeave}</div>
            </div>
            <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-100 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-mono text-rose-700 uppercase">Absent / Unmarked</div>
              <div className="text-xl font-bold text-rose-700 mt-0.5">
                {stats.absent + stats.unmarked}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-neutral-600 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Role Notice for Junior */}
      {activeRole === "JUNIOR" && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Junior Advocate Mode:</strong> You can mark your own presence and view the daily chamber roster. Main advocate attendance management is reserved for Lead Counsel.
          </span>
        </div>
      )}

      {/* Members Attendance List */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              Advocate Attendance Roster
            </h2>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {members.length} Registered Counsel
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-neutral-400 space-y-2">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" />
            <p>Loading attendance data for {selectedDate}...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-xs space-y-3">
            <Users className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="font-semibold text-neutral-700">No advocates registered in this chamber roster yet.</p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Lawyers to Chamber</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {members.map((member) => {
              const isEditable = canEditMember(member);
              const isSaving = savingMemberId === member.memberId;

              return (
                <div
                  key={member.memberId}
                  className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    !isEditable ? "bg-neutral-50/40" : "hover:bg-neutral-50/30"
                  }`}
                >
                  {/* Member Info */}
                  <div className="flex items-start gap-3 min-w-[240px]">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        member.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">{member.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                            member.role === "ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {member.role === "ADMIN" ? "Lead / Admin" : "Junior"}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 font-mono mt-0.5">
                        {member.phone} • {member.title}
                      </div>
                    </div>
                  </div>

                  {/* Status Selector Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { key: "PRESENT", label: "Present", color: "emerald", icon: CheckCircle2 },
                      { key: "IN_COURT", label: "In Court", color: "sky", icon: Briefcase },
                      { key: "ON_LEAVE", label: "On Leave", color: "amber", icon: Clock },
                      { key: "ABSENT", label: "Absent", color: "rose", icon: UserX },
                    ].map((btn) => {
                      const isSelected = member.status === btn.key;
                      const Icon = btn.icon;

                      return (
                        <button
                          key={btn.key}
                          type="button"
                          disabled={!isEditable || isSaving}
                          onClick={() => updateMemberStatus(member.memberId, btn.key)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? btn.color === "emerald"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : btn.color === "sky"
                                ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                                : btn.color === "amber"
                                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                : "bg-rose-600 text-white border-rose-600 shadow-sm"
                              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                          } ${!isEditable ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Appearance / Court Notes */}
                  <div className="w-full lg:w-72">
                    <input
                      type="text"
                      disabled={!isEditable || isSaving}
                      defaultValue={member.notes}
                      onBlur={(e) => {
                        if (e.target.value !== member.notes) {
                          updateMemberStatus(member.memberId, member.status, e.target.value);
                        }
                      }}
                      placeholder={
                        isEditable
                          ? "Add court notes (e.g. Kalyan Court No. 2)"
                          : "No notes entered"
                      }
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-black disabled:bg-neutral-50 disabled:text-neutral-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
