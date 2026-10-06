"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Phone,
  User,
  Users,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Edit3,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  ArrowRight,
  UserPlus,
  Sparkles,
  Info,
  Calendar,
  Lock,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  phone: string;
  role: "ADMIN" | "JUNIOR";
  title?: string | null;
  createdAt: string;
}

interface FirmData {
  id: string;
  name: string;
  slug: string;
  leadAdvocate?: string | null;
  contactPhone?: string | null;
  clientMessageIntro?: string | null;
  dispatchMode: "AUTOMATIC" | "MANUAL";
  members: Member[];
  _count?: {
    cases: number;
    members: number;
  };
}

export default function ChamberOnboardingPage() {
  const [activeFirm, setActiveFirm] = useState<FirmData | null>(null);
  const [allFirms, setAllFirms] = useState<any[]>([]);
  const [activeRole, setActiveRole] = useState<"ADMIN" | "JUNIOR">("ADMIN");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Chamber Settings Form
  const [chamberName, setChamberName] = useState("");
  const [leadAdvocate, setLeadAdvocate] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [dispatchMode, setDispatchMode] = useState<"AUTOMATIC" | "MANUAL">("AUTOMATIC");
  const [clientIntro, setClientIntro] = useState("");

  // Add Member Modal State
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"JUNIOR" | "ADMIN">("JUNIOR");
  const [newMemberTitle, setNewMemberTitle] = useState("Junior Advocate");
  const [addingMember, setAddingMember] = useState(false);

  // Create New Chamber Modal State
  const [showCreateChamber, setShowCreateChamber] = useState(false);
  const [newFirmName, setNewFirmName] = useState("");
  const [newFirmLead, setNewFirmLead] = useState("");
  const [newFirmPhone, setNewFirmPhone] = useState("+91 98506 70809");
  const [newFirmDispatch, setNewFirmDispatch] = useState<"AUTOMATIC" | "MANUAL">("MANUAL");
  const [creatingFirm, setCreatingFirm] = useState(false);

  const loadFirmData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/firm");
      const data = await res.json();
      if (data.activeFirm) {
        setActiveFirm(data.activeFirm);
        setChamberName(data.activeFirm.name || "");
        setLeadAdvocate(data.activeFirm.leadAdvocate || "");
        setContactPhone(data.activeFirm.contactPhone || "");
        setDispatchMode(data.activeFirm.dispatchMode || "AUTOMATIC");
        setClientIntro(
          data.activeFirm.clientMessageIntro ||
            `Dear Client, greetings from ${data.activeFirm.name}. Here is an official court update regarding your ongoing matter:`
        );
      }
      if (data.activeRole) setActiveRole(data.activeRole);
      if (Array.isArray(data.firms)) setAllFirms(data.firms);
    } catch (err: any) {
      console.error("Failed to load chamber onboarding data:", err);
      setFeedback({ message: "Failed to load chamber details", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFirmData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) return;
    setSavingSettings(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/firms/${activeFirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: chamberName,
          leadAdvocate,
          contactPhone,
          dispatchMode,
          clientMessageIntro: clientIntro,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update chamber settings");

      setFeedback({ message: "Chamber configuration saved successfully!", type: "success" });
      await loadFirmData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRoleToggle = async (targetRole: "ADMIN" | "JUNIOR", memberId?: string) => {
    setSwitchingRole(true);
    try {
      const res = await fetch("/api/auth/firm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole, memberId }),
      });
      if (res.ok) {
        setActiveRole(targetRole);
        setFeedback({
          message: `Switched active session to ${
            targetRole === "ADMIN" ? "Lead Advocate (Full CRUD Admin)" : "Junior Advocate (View-Only Access)"
          }`,
          type: "success",
        });
        setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    } catch (err: any) {
      setFeedback({ message: "Failed to switch role", type: "error" });
    } finally {
      setSwitchingRole(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) return;
    setAddingMember(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/firms/${activeFirm.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          phone: newMemberPhone.trim(),
          role: newMemberRole,
          title: newMemberTitle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add advocate");

      setFeedback({ message: `Advocate ${newMemberName} added to chamber roster!`, type: "success" });
      setShowAddMember(false);
      setNewMemberName("");
      setNewMemberPhone("");
      setNewMemberTitle("Junior Advocate");
      await loadFirmData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!activeFirm) return;
    if (!confirm("Are you sure you want to remove this advocate from the chamber roster?")) return;
    try {
      const res = await fetch(`/api/firms/${activeFirm.id}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove advocate");
      setFeedback({ message: "Advocate removed from chamber.", type: "success" });
      await loadFirmData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const handleCreateNewChamber = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingFirm(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFirmName.trim(),
          leadAdvocate: newFirmLead.trim() || undefined,
          contactPhone: newFirmPhone.trim() || undefined,
          dispatchMode: newFirmDispatch,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to onboard chamber");

      setFeedback({ message: `Chamber "${newFirmName}" successfully registered!`, type: "success" });
      setShowCreateChamber(false);
      window.location.reload();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setCreatingFirm(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-xs text-neutral-400 space-y-2">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" />
        <p>Loading chamber onboarding & configuration...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-8 max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Chamber Governance & Onboarding</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Chamber Setup & Advocate Access
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure official contact phone, automatic vs. manual WhatsApp dispatching, and manage junior lawyer access roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateChamber(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-white text-neutral-800 text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Chamber</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
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

      {/* Active Role Quick-Switcher Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded text-neutral-300">
              Active Session RBAC
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                activeRole === "ADMIN"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-400/30"
                  : "bg-blue-500/20 text-blue-300 border border-blue-400/30"
              }`}
            >
              {activeRole === "ADMIN" ? "Lead Advocate (Full CRUD)" : "Junior Advocate (View-Only)"}
            </span>
          </div>
          <p className="text-xs text-neutral-300">
            {activeRole === "ADMIN"
              ? "Lead Admin has full permissions to add, edit, delete cases, modify dispatch messages, and manage chamber roster."
              : "Junior Advocate is in View-Only mode: cannot add, edit, delete cases or dispatch WhatsApp messages."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-neutral-950/60 p-1.5 rounded-lg border border-white/10 self-start md:self-auto">
          <span className="text-[11px] font-mono text-neutral-400 px-2">Switch Test Role:</span>
          <button
            onClick={() => handleRoleToggle("ADMIN")}
            disabled={switchingRole}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeRole === "ADMIN"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Lead Admin
          </button>
          <button
            onClick={() => handleRoleToggle("JUNIOR")}
            disabled={switchingRole}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeRole === "JUNIOR"
                ? "bg-blue-600 text-white shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Junior (View-Only)
          </button>
        </div>
      </div>

      {activeFirm ? (
        <div className="space-y-8">
          {/* Section 1: Chamber Profile & WhatsApp Dispatching Mode */}
          <form
            onSubmit={handleSaveSettings}
            className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                    1. Chamber Profile & Dispatch Settings
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Official phone number, lead advocate name, and automated message dispatch rules.
                  </p>
                </div>
              </div>

              {activeRole === "ADMIN" && (
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingSettings ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Configuration</span>
                </button>
              )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Chamber Name *
                </label>
                <input
                  type="text"
                  disabled={activeRole === "JUNIOR"}
                  value={chamberName}
                  onChange={(e) => setChamberName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-neutral-50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Lead Advocate Name
                </label>
                <input
                  type="text"
                  disabled={activeRole === "JUNIOR"}
                  value={leadAdvocate}
                  onChange={(e) => setLeadAdvocate(e.target.value)}
                  placeholder="e.g. Adv. Nileema Saranga"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-neutral-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Official Chamber Contact Phone (WhatsApp Updates) *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    disabled={activeRole === "JUNIOR"}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98506 70809"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-neutral-50"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  This official phone number is included in automated court update messages for client queries.
                </p>
              </div>
            </div>

            {/* Dispatch Mode Selector */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-neutral-800">
                WhatsApp Update Dispatch Mode
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Automatic Card */}
                <div
                  onClick={() => activeRole === "ADMIN" && setDispatchMode("AUTOMATIC")}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    dispatchMode === "AUTOMATIC"
                      ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  } ${activeRole === "JUNIOR" ? "cursor-default" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-neutral-900">Automatic Dispatch</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                      Instant
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Updates detected from eCourts are immediately formatted and dispatched to clients and advocates via WhatsApp automatically.
                  </p>
                </div>

                {/* Manual Card */}
                <div
                  onClick={() => activeRole === "ADMIN" && setDispatchMode("MANUAL")}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    dispatchMode === "MANUAL"
                      ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-600"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  } ${activeRole === "JUNIOR" ? "cursor-default" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Edit3 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-neutral-900">Manual Dispatch (Lawyer Review)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold uppercase">
                      Review & Edit
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Updates are held in a pending queue. Senior Counsel has the right to review, edit the message text, adjust dates/notes, and dispatch manually.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Intro Message Textarea */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Client WhatsApp Message Greeting & Header
              </label>
              <textarea
                rows={2}
                disabled={activeRole === "JUNIOR"}
                value={clientIntro}
                onChange={(e) => setClientIntro(e.target.value)}
                placeholder="Dear Client, greetings from Saranga Law Chambers..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-neutral-50 font-mono"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Note: Client messages strictly exclude internal court status codes to keep communication professional and client-friendly.
              </p>
            </div>
          </form>

          {/* Section 2: Advocate Roster & Junior Access Management */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                    2. Chamber Advocates & Role Access Roster
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Lead Counsel (Admin) has add/edit/delete authority; Junior Advocates have view-only access.
                  </p>
                </div>
              </div>

              {activeRole === "ADMIN" && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Junior Lawyer</span>
                </button>
              )}
            </div>

            {/* RBAC Rules Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50/70 p-4 rounded-xl border border-neutral-200/60 text-xs">
              <div className="space-y-1.5">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Lead Advocate / Admin Role</span>
                </div>
                <ul className="text-neutral-600 space-y-1 pl-5 list-disc text-[11px]">
                  <li>Full CRUD: Add, edit, and delete court cases</li>
                  <li>Assign matter to advocates with briefing notes</li>
                  <li>Review, edit update messages & dispatch WhatsApp alerts</li>
                  <li>Manage chamber roster, phone numbers & settings</li>
                  <li>Mark daily attendance for all chamber members</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Junior Advocate (View-Only Role)</span>
                </div>
                <ul className="text-neutral-600 space-y-1 pl-5 list-disc text-[11px]">
                  <li>View tracked cases, next hearing dates & diary</li>
                  <li>View chamber calendar, daily cause lists & orders</li>
                  <li>Mark own daily attendance and check team presence</li>
                  <li><strong>Cannot</strong> add, edit, or delete cases/contacts</li>
                  <li><strong>Cannot</strong> dispatch WhatsApp notifications</li>
                </ul>
              </div>
            </div>

            {/* Member List Table */}
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-neutral-50 text-[11px] font-mono uppercase tracking-wider text-neutral-500 grid grid-cols-12 gap-2">
                <div className="col-span-5">Advocate Name & Designation</div>
                <div className="col-span-3">Phone Number</div>
                <div className="col-span-2">Access Role</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {activeFirm.members && activeFirm.members.length > 0 ? (
                activeFirm.members.map((member) => (
                  <div
                    key={member.id}
                    className="px-4 py-3.5 grid grid-cols-12 gap-2 items-center hover:bg-neutral-50/60 transition-colors text-xs"
                  >
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          member.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900">{member.name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {member.title || (member.role === "ADMIN" ? "Lead Advocate" : "Junior Advocate")}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 font-mono text-neutral-700">
                      {member.phone}
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          member.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {member.role === "ADMIN" ? "Admin (CRUD)" : "Junior (View)"}
                      </span>
                    </div>

                    <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                      {activeRole === "ADMIN" && (
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors"
                          title="Remove advocate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No advocates registered yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center space-y-3">
          <Building2 className="w-10 h-10 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No Active Chamber Selected</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Please register your law chamber or select an existing chamber from the login portal.
          </p>
          <button
            onClick={() => setShowCreateChamber(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard New Chamber</span>
          </button>
        </div>
      )}

      {/* Modal: Add Junior Advocate */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-black" />
                <h3 className="text-sm font-bold text-neutral-900">Add Advocate to Chamber</h3>
              </div>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-neutral-400 hover:text-neutral-600 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Advocate Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Adv. Soham Saranga"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mobile / WhatsApp Number *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="+91 80800 88656"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Role Permission Level *
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as "JUNIOR" | "ADMIN")}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="JUNIOR">Junior Advocate (View-Only Access)</option>
                  <option value="ADMIN">Lead Advocate / Partner (Full Admin CRUD)</option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Junior advocates can view cases & attendance, but cannot add/edit/delete or dispatch.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Title / Designation
                </label>
                <input
                  type="text"
                  value={newMemberTitle}
                  onChange={(e) => setNewMemberTitle(e.target.value)}
                  placeholder="Junior Advocate / High Court Associate"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-4 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Advocate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register New Chamber */}
      {showCreateChamber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-black" />
                <h3 className="text-sm font-bold text-neutral-900">Onboard New Law Chamber</h3>
              </div>
              <button
                onClick={() => setShowCreateChamber(false)}
                className="text-neutral-400 hover:text-neutral-600 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewChamber} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Chamber / Law Firm Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFirmName}
                  onChange={(e) => setNewFirmName(e.target.value)}
                  placeholder="e.g. Saranga Law Chambers"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Lead Advocate Name
                </label>
                <input
                  type="text"
                  value={newFirmLead}
                  onChange={(e) => setNewFirmLead(e.target.value)}
                  placeholder="e.g. Adv. Nileema Saranga"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Official WhatsApp Contact Phone *
                </label>
                <input
                  type="text"
                  required
                  value={newFirmPhone}
                  onChange={(e) => setNewFirmPhone(e.target.value)}
                  placeholder="+91 98506 70809"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Default Dispatch Mode
                </label>
                <select
                  value={newFirmDispatch}
                  onChange={(e) => setNewFirmDispatch(e.target.value as "AUTOMATIC" | "MANUAL")}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="AUTOMATIC">Automatic (Instant Dispatch on Updates)</option>
                  <option value="MANUAL">Manual (Review & Edit Message First)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateChamber(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFirm}
                  className="px-4 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingFirm && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Register & Open</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
