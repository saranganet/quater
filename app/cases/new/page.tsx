"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  User,
  Phone,
  Hash,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  Building2,
  MessageSquare,
} from "lucide-react";

interface Firm {
  id: string;
  name: string;
  slug: string;
  leadAdvocate?: string | null;
  contactPhone?: string | null;
  clientMessageIntro?: string | null;
  clientCustomNote?: string | null;
}

export default function NewCasePage() {
  const router = useRouter();

  const [cnr, setCnr] = useState("");
  const [lawyerName, setLawyerName] = useState("");
  const [lawyerPhone, setLawyerPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientWhatsAppNumber, setClientWhatsAppNumber] = useState("");

  // Firm selection
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load firms
  useEffect(() => {
    fetch("/api/firms")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFirms(data);
          setSelectedFirmId(data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load firms:", err));
  }, []);

  const selectedFirm = firms.find((f) => f.id === selectedFirmId);

  // Quick fill sample data for fast testing
  const handleQuickFill = () => {
    setCnr("DLND020047882015");
    setLawyerName("Adv. Nalawade");
    setLawyerPhone("+91 98200 11223");
    setClientName("Rahul Verma");
    setClientWhatsAppNumber("+91 98765 43210");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick checks
    const cleanedCnr = cnr.trim().toUpperCase();
    if (!/^[A-Z0-9]{16}$/.test(cleanedCnr)) {
      setErrorMessage("CNR Number must be exactly 16 alphanumeric characters (e.g. DLND020047882015).");
      return;
    }

    setIsLoading(true);
    setCurrentStep("Validating CNR format & phone numbers...");

    try {
      setCurrentStep("Querying eCourtsIndia Partner API...");

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnr: cleanedCnr,
          lawyerName,
          lawyerPhone,
          clientName,
          clientWhatsAppNumber,
          firmId: selectedFirmId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.existingCaseId) {
          router.push(`/cases/${data.existingCaseId}`);
          return;
        }
        throw new Error(data.error || "Failed to onboard case");
      }

      setCurrentStep("Case retrieved! Storing initial snapshot & normalizing fields...");

      // Short delay for user to read status before redirect
      setTimeout(() => {
        router.push(`/cases/${data.caseId}`);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while onboarding the case.");
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-slate-400 mb-6 gap-2">
        <Link href="/" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-200">Track New Case</span>
      </nav>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="p-6 sm:p-8 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Track New Court Case
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fetch live snapshot from eCourtsIndia and configure WhatsApp alerts for Lawyer & Client
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleQuickFill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all self-start sm:self-center"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Autofill Sample Case
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3 text-rose-200 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-300">Onboarding Failed</p>
                <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Firm Selection */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
            <label htmlFor="firmSelect" className="block text-sm font-semibold text-amber-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Select Law Firm (Customizes Client WhatsApp Message)
            </label>
            <select
              id="firmSelect"
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {firms.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name} ({firm.leadAdvocate || "Lead Counsel"})
                </option>
              ))}
            </select>

            {selectedFirm && (
              <div className="mt-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-amber-300">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Customized Message for Client:
                </div>
                <div className="italic text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] leading-relaxed">
                  ⚖️ COURT CASE UPDATE - {selectedFirm.name}
                  <br />
                  {selectedFirm.clientMessageIntro}
                  <br />
                  💬 Note: {selectedFirm.clientCustomNote}
                  {selectedFirm.contactPhone ? `<br />📞 Contact: ${selectedFirm.contactPhone}` : ""}
                </div>
              </div>
            )}
          </div>

          {/* CNR Input Section */}
          <div className="space-y-2">
            <label htmlFor="cnr" className="block text-sm font-semibold text-slate-200">
              CNR Number (16 Alphanumeric Characters)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="cnr"
                type="text"
                required
                maxLength={16}
                value={cnr}
                onChange={(e) => setCnr(e.target.value.toUpperCase())}
                placeholder="e.g. DLND020047882015"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 text-base transition-colors"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-slate-400">
              Format: 4-letter court code + 2-letter establishment + 6-digit case no. + 4-digit filing year.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Lawyer Details */}
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-300 border-b border-slate-800 pb-2">
                <User className="w-4 h-4 text-amber-400" />
                Lawyer Information
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lawyerName" className="block text-xs font-medium text-slate-300">
                  Lawyer Full Name
                </label>
                <input
                  id="lawyerName"
                  type="text"
                  required
                  value={lawyerName}
                  onChange={(e) => setLawyerName(e.target.value)}
                  placeholder="Adv. Nalawade"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lawyerPhone" className="block text-xs font-medium text-slate-300">
                  Lawyer WhatsApp Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input
                    id="lawyerPhone"
                    type="tel"
                    required
                    value={lawyerPhone}
                    onChange={(e) => setLawyerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Client Details */}
            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300 border-b border-slate-800 pb-2">
                <User className="w-4 h-4 text-emerald-400" />
                Client Information
              </div>

              <div className="space-y-1.5">
                <label htmlFor="clientName" className="block text-xs font-medium text-slate-300">
                  Client Full Name
                </label>
                <input
                  id="clientName"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Rahul Verma"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="clientWhatsAppNumber" className="block text-xs font-medium text-slate-300">
                  Client WhatsApp Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input
                    id="clientWhatsAppNumber"
                    type="tel"
                    required
                    value={clientWhatsAppNumber}
                    onChange={(e) => setClientWhatsAppNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status Step Indicator when loading */}
          {isLoading && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-200">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">Processing Pipeline: </span>
                <span>{currentStep}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-[1.01] text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting eCourts...
                </>
              ) : (
                <>
                  Add & Fetch Case
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
