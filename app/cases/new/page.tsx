"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ArrowRight } from "lucide-react";

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

  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    const cleanedCnr = cnr.trim().toUpperCase();
    if (!/^[A-Z0-9]{16}$/.test(cleanedCnr)) {
      setErrorMessage("CNR Number must be exactly 16 alphanumeric characters (e.g. DLND020047882015).");
      return;
    }

    setIsLoading(true);
    setCurrentStep("Validating CNR format & phone numbers...");

    try {
      setCurrentStep("Connecting to eCourts Partner API...");

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

      setCurrentStep("Snapshot stored. Redirecting to diary...");

      setTimeout(() => {
        router.push(`/cases/${data.caseId}`);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred.");
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-black transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Track New Court Case
          </h1>
        </div>

        <button
          type="button"
          onClick={handleQuickFill}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neutral-300 hover:border-black rounded-md bg-white text-neutral-800 transition-colors self-start sm:self-auto"
        >
          Autofill Sample Case
        </button>
      </div>

      {/* Main Form Box */}
      <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-md border border-neutral-300 bg-neutral-50 text-xs font-mono text-neutral-900">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {/* CNR Input */}
          <div className="space-y-1.5">
            <label htmlFor="cnr" className="block text-xs font-bold uppercase tracking-wider text-black">
              Case CNR Number (16 Characters)
            </label>
            <input
              id="cnr"
              type="text"
              required
              maxLength={16}
              value={cnr}
              onChange={(e) => setCnr(e.target.value.toUpperCase())}
              placeholder="DLND020047882015"
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-md font-mono text-sm tracking-wider text-black placeholder-neutral-400 focus:outline-none focus:border-black"
              disabled={isLoading}
            />
            <p className="text-[11px] font-mono text-neutral-400">
              Unique court identification code from official eCourts receipt or summons.
            </p>
          </div>

          {/* Firm Selection */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label htmlFor="firmSelect" className="block text-xs font-bold uppercase tracking-wider text-black">
              Representing Law Firm
            </label>
            <select
              id="firmSelect"
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-md px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-black"
            >
              {firms.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name} ({firm.leadAdvocate || "Counsel"})
                </option>
              ))}
            </select>

            {selectedFirm && (
              <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 space-y-1 text-xs">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block tracking-wider">
                  Client Message Preview ({selectedFirm.name})
                </span>
                <p className="font-mono text-[11px] text-neutral-600 italic">
                  &ldquo;{selectedFirm.clientMessageIntro}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Lawyer & Client Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-neutral-100">
            {/* Lawyer Details */}
            <div className="space-y-3.5 p-4 rounded-md border border-neutral-200 bg-neutral-50/50">
              <span className="text-xs font-bold uppercase tracking-wider text-black block">
                Lawyer Contact
              </span>

              <div className="space-y-1">
                <label htmlFor="lawyerName" className="block text-[11px] font-mono text-neutral-500">
                  Name
                </label>
                <input
                  id="lawyerName"
                  type="text"
                  required
                  value={lawyerName}
                  onChange={(e) => setLawyerName(e.target.value)}
                  placeholder="Adv. Nalawade"
                  className="w-full bg-white border border-neutral-300 rounded-md px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="lawyerPhone" className="block text-[11px] font-mono text-neutral-500">
                  WhatsApp Number
                </label>
                <input
                  id="lawyerPhone"
                  type="tel"
                  required
                  value={lawyerPhone}
                  onChange={(e) => setLawyerPhone(e.target.value)}
                  placeholder="+91 98200 11223"
                  className="w-full bg-white border border-neutral-300 rounded-md px-3 py-2 text-xs font-mono text-black focus:outline-none focus:border-black"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Client Details */}
            <div className="space-y-3.5 p-4 rounded-md border border-neutral-200 bg-neutral-50/50">
              <span className="text-xs font-bold uppercase tracking-wider text-black block">
                Client Contact
              </span>

              <div className="space-y-1">
                <label htmlFor="clientName" className="block text-[11px] font-mono text-neutral-500">
                  Name
                </label>
                <input
                  id="clientName"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Rahul Verma"
                  className="w-full bg-white border border-neutral-300 rounded-md px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="clientWhatsAppNumber" className="block text-[11px] font-mono text-neutral-500">
                  WhatsApp Number
                </label>
                <input
                  id="clientWhatsAppNumber"
                  type="tel"
                  required
                  value={clientWhatsAppNumber}
                  onChange={(e) => setClientWhatsAppNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-neutral-300 rounded-md px-3 py-2 text-xs font-mono text-black focus:outline-none focus:border-black"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Loading status */}
          {isLoading && (
            <div className="p-3.5 rounded-md border border-neutral-300 bg-neutral-50 text-xs font-mono text-black flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{currentStep}</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-md text-xs font-medium text-neutral-600 hover:text-black transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-md text-xs transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching from eCourts...
                </>
              ) : (
                <>
                  Fetch & Register Case <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
