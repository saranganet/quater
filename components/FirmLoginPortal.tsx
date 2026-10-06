"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Plus,
  Loader2,
  Phone,
  UserCheck,
  CheckCircle2,
  Scale,
  Sparkles,
  MessageSquare,
} from "lucide-react";

interface FirmWithCount {
  id: string;
  name: string;
  slug: string;
  leadAdvocate?: string | null;
  contactPhone?: string | null;
  clientMessageIntro?: string | null;
  clientCustomNote?: string | null;
  _count?: {
    cases: number;
  };
}

interface FirmLoginPortalProps {
  firms: FirmWithCount[];
}

export function FirmLoginPortal({ firms }: FirmLoginPortalProps) {
  const router = useRouter();
  const [loadingFirmId, setLoadingFirmId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Firm Form State
  const [newFirmName, setNewFirmName] = useState("");
  const [newLeadAdvocate, setNewLeadAdvocate] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newMessageIntro, setNewMessageIntro] = useState("");
  const [newCustomNote, setNewCustomNote] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const handleSelectFirm = async (firmId: string, role: "ADMIN" | "JUNIOR" = "ADMIN") => {
    setLoadingFirmId(firmId);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmId, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log in to firm.");
      }

      // Refresh to load the scoped dashboard
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during login.");
      setLoadingFirmId(null);
    }
  };

  const handleRegisterNewFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmName.trim()) {
      setErrorMsg("Firm name is required.");
      return;
    }

    setIsSubmittingNew(true);
    setErrorMsg(null);

    try {
      const createRes = await fetch("/api/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFirmName.trim(),
          leadAdvocate: newLeadAdvocate.trim() || undefined,
          contactPhone: newContactPhone.trim() || undefined,
          clientMessageIntro: newMessageIntro.trim() || undefined,
          clientCustomNote: newCustomNote.trim() || undefined,
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(errorData.error || "Failed to create firm.");
      }

      const createdFirm = await createRes.json();

      // Automatically log into the newly created firm
      const authRes = await fetch("/api/auth/firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmId: createdFirm.id }),
      });

      if (!authRes.ok) {
        throw new Error("Firm created, but auto-login failed. Please select it from the list.");
      }

      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register firm.");
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 space-y-10 animate-in fade-in duration-300">
      {/* Hero / Portal Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] font-mono uppercase tracking-widest text-neutral-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Enterprise Law Chamber Isolation
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
          Select Your Law Chamber to Enter
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Quater strictly isolates case listings, automated eCourts monitoring, client directories,
          and WhatsApp dispatches by law firm. Choose your chamber below to access your confidential workspace.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Existing Firms Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
            <Building2 className="w-4 h-4 text-neutral-500" />
            Registered Law Chambers ({firms.length})
          </h2>
          <span className="text-[11px] font-mono text-neutral-400">
            Click to access isolated workspace
          </span>
        </div>

        {firms.length === 0 ? (
          <div className="text-center py-12 border border-neutral-200 rounded-lg bg-neutral-50/50 space-y-3">
            <Scale className="w-8 h-8 text-neutral-400 mx-auto" />
            <p className="text-sm font-medium text-neutral-600">
              No registered law chambers found in the database.
            </p>
            <p className="text-xs text-neutral-400">
              Please register your law firm below to begin tracking court cases.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {firms.map((firm) => {
              const isLoadingThis = loadingFirmId === firm.id;
              const caseCount = firm._count?.cases ?? 0;

              return (
                <div
                  key={firm.id}
                  className="group relative border border-neutral-200 rounded-xl p-5 bg-white hover:border-black hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                          Chamber ID: {firm.slug}
                        </div>
                        <h3 className="text-lg font-bold text-black mt-0.5 group-hover:text-black transition-colors">
                          {firm.name}
                        </h3>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {caseCount} {caseCount === 1 ? "Matter" : "Matters"}
                      </span>
                    </div>

                    {/* Metadata details */}
                    <div className="space-y-1 text-xs text-neutral-600 font-sans border-t border-neutral-100 pt-3">
                      {firm.leadAdvocate && (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="text-neutral-500 font-mono text-[11px]">Lead:</span>
                          <span className="font-medium text-neutral-900">{firm.leadAdvocate}</span>
                        </div>
                      )}
                      {firm.contactPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="text-neutral-500 font-mono text-[11px]">Phone:</span>
                          <span className="font-mono text-neutral-800">{firm.contactPhone}</span>
                        </div>
                      )}
                      {firm.clientMessageIntro && (
                        <div className="flex items-start gap-1.5 mt-2 bg-neutral-50 p-2 rounded text-[11px] text-neutral-600 border border-neutral-100">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="line-clamp-2 italic">"{firm.clientMessageIntro}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-100 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loadingFirmId !== null}
                      onClick={() => handleSelectFirm(firm.id, "ADMIN")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-[11px] font-semibold tracking-wide transition-colors disabled:opacity-50"
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Lead Counsel</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={loadingFirmId !== null}
                      onClick={() => handleSelectFirm(firm.id, "JUNIOR")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-semibold tracking-wide transition-colors disabled:opacity-50 border border-neutral-200"
                    >
                      <span>Junior (View-Only)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Section Toggle */}
      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
        <div className="p-5 bg-neutral-50/70 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-black flex items-center gap-2">
              <Plus className="w-4 h-4 text-neutral-600" />
              Not seeing your firm? Register a new law chamber
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Set up dedicated WhatsApp dispatch headers and advocate routing in 30 seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-md border border-neutral-300 bg-white text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors shrink-0"
          >
            {isRegistering ? "Hide Registration Form" : "+ Add New Chamber"}
          </button>
        </div>

        {isRegistering && (
          <form onSubmit={handleRegisterNewFirm} className="p-6 space-y-5 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Law Firm / Chamber Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFirmName}
                  onChange={(e) => setNewFirmName(e.target.value)}
                  placeholder="e.g. Saranga & Partners Legal"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Lead Advocate
                </label>
                <input
                  type="text"
                  value={newLeadAdvocate}
                  onChange={(e) => setNewLeadAdvocate(e.target.value)}
                  placeholder="e.g. Adv. Nileema Saranga"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Chamber Contact Phone
                </label>
                <input
                  type="text"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="e.g. +91 98200 11223"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Client WhatsApp Intro Greeting
                </label>
                <input
                  type="text"
                  value={newMessageIntro}
                  onChange={(e) => setNewMessageIntro(e.target.value)}
                  placeholder="e.g. Official court listing update from Saranga & Partners:"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Custom Client Footer Note (Appears on WhatsApp notifications)
              </label>
              <textarea
                rows={2}
                value={newCustomNote}
                onChange={(e) => setNewCustomNote(e.target.value)}
                placeholder="e.g. Counsel will appear on scheduled date. Contact chambers for urgent briefings."
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded-md hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingNew}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-black text-white text-xs font-semibold rounded-md hover:bg-neutral-800 disabled:opacity-50"
              >
                {isSubmittingNew ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Register & Enter Workspace
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Confidentiality Guarantee */}
      <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50 flex items-start gap-4 text-xs text-neutral-600">
        <Scale className="w-5 h-5 text-neutral-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-neutral-900">
            Strict Confidentiality & Independent Cause Lists
          </div>
          <p className="leading-relaxed">
            Law firms logged in to Quater operate in siloed environments. CNR tracking queries, advocate courtroom schedules,
            client phone directories, and WhatsApp delivery logs are scoped exclusively to the logged-in chamber.
          </p>
        </div>
      </div>
    </div>
  );
}
