"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  ArrowRight,
  Building2,
  ShieldCheck,
  Plus,
  Trash2,
  UserCheck,
  Users,
  Hash,
  Scale,
  FileText,
  Sparkles,
  Search,
} from "lucide-react";
import { generateCnrFromCaseDetails } from "@/lib/ecourts/cnr-generator";
import {
  STATE_DISTRICT_HIERARCHY,
  COMPREHENSIVE_CASE_TYPES,
  INDIAN_STATES,
  getDistrictsForState,
  getCourtsForDistrict,
} from "@/lib/ecourts/court-directory";

interface Firm {
  id: string;
  name: string;
  slug: string;
  leadAdvocate?: string | null;
  contactPhone?: string | null;
  clientMessageIntro?: string | null;
  clientCustomNote?: string | null;
}

interface AdditionalContact {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export default function NewCasePage() {
  const router = useRouter();

  // Mode: "cnr" (16-char CNR) or "case_number" (Court, Type, Number, Year)
  const [entryMode, setEntryMode] = useState<"cnr" | "case_number">("cnr");

  // CNR Mode State
  const [cnr, setCnr] = useState("");

  // Case Number Mode State (Cascaded: State -> District -> Court Establishment & Case Type)
  const [selectedState, setSelectedState] = useState("MH");
  const [selectedDistrict, setSelectedDistrict] = useState("Thane");
  const [courtSelection, setCourtSelection] = useState("Civil Court S.D. Kalyan");
  const [customCourtName, setCustomCourtName] = useState("");
  const [courtSearchQuery, setCourtSearchQuery] = useState("");

  const [caseType, setCaseType] = useState("CS");
  const [customCaseType, setCustomCaseType] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [filingYear, setFilingYear] = useState("2019");

  // Lawyer & Client Information
  const [lawyerName, setLawyerName] = useState("");
  const [lawyerPhone, setLawyerPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientWhatsAppNumber, setClientWhatsAppNumber] = useState("");

  // Additional lawyer contacts
  const [additionalLawyers, setAdditionalLawyers] = useState<AdditionalContact[]>([]);
  // Additional client contacts
  const [additionalClients, setAdditionalClients] = useState<AdditionalContact[]>([]);

  const [activeFirm, setActiveFirm] = useState<Firm | null>(null);
  const [selectedFirmId, setSelectedFirmId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available districts for chosen state
  const availableDistricts = useMemo(() => {
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  // Selected district info object
  const currentDistrictObj = useMemo(() => {
    return (
      availableDistricts.find((d) => d.name === selectedDistrict) ||
      availableDistricts[0]
    );
  }, [availableDistricts, selectedDistrict]);

  // Available court establishments for chosen district
  const availableCourts = useMemo(() => {
    if (!currentDistrictObj) return [];
    return currentDistrictObj.courts || [];
  }, [currentDistrictObj]);

  // Filtered courts within the selected district based on search query
  const filteredDistrictCourts = useMemo(() => {
    if (!courtSearchQuery.trim()) return availableCourts;
    const q = courtSearchQuery.toLowerCase();
    return availableCourts.filter((c) => c.toLowerCase().includes(q));
  }, [availableCourts, courtSearchQuery]);

  // Group case types by category
  const caseTypesByGroup = useMemo(() => {
    const groups: Record<string, typeof COMPREHENSIVE_CASE_TYPES> = {};
    for (const t of COMPREHENSIVE_CASE_TYPES) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    }
    return groups;
  }, []);

  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const districts = getDistrictsForState(newState);
    const firstDistrict = districts[0]?.name || "";
    setSelectedDistrict(firstDistrict);
    const courts = districts[0]?.courts || [];
    setCourtSelection(courts[0] || "CUSTOM");
    setCourtSearchQuery("");
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    const courts = getCourtsForDistrict(selectedState, newDistrict);
    setCourtSelection(courts[0] || "CUSTOM");
    setCourtSearchQuery("");
  };

  // Computed CNR Preview for Case Number mode
  const effectiveCourtName = courtSelection === "CUSTOM" ? customCourtName : courtSelection;
  const effectiveCaseType = caseType === "OTHER" ? customCaseType : caseType;

  const derivedCnrPreview = useMemo(() => {
    if (!caseNumber.trim()) return "";
    return generateCnrFromCaseDetails({
      caseNumber: caseNumber.trim(),
      caseType: effectiveCaseType,
      filingYear: filingYear.trim(),
      courtName: effectiveCourtName,
      state: selectedState,
      districtCode: currentDistrictObj?.code,
    });
  }, [caseNumber, effectiveCaseType, filingYear, effectiveCourtName, selectedState, currentDistrictObj]);

  useEffect(() => {
    fetch("/api/auth/firm")
      .then((res) => res.json())
      .then((data) => {
        if (!data.activeFirm) {
          router.push("/");
          return;
        }
        setActiveFirm(data.activeFirm);
        setSelectedFirmId(data.activeFirm.id);

        if (data.activeFirm.leadAdvocate && !lawyerName) {
          setLawyerName(data.activeFirm.leadAdvocate);
        }
        if (data.activeFirm.contactPhone && !lawyerPhone) {
          setLawyerPhone(data.activeFirm.contactPhone);
        }
      })
      .catch((err) => console.error("Failed to load firm session:", err));
  }, [router]);

  const handleAddLawyer = () => {
    setAdditionalLawyers([
      ...additionalLawyers,
      {
        id: Math.random().toString(36).substring(7),
        name: "",
        phone: "",
        role: "Junior Advocate",
      },
    ]);
  };

  const handleRemoveLawyer = (id: string) => {
    setAdditionalLawyers(additionalLawyers.filter((l) => l.id !== id));
  };

  const handleUpdateLawyer = (id: string, field: "name" | "phone" | "role", value: string) => {
    setAdditionalLawyers(
      additionalLawyers.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const handleAddClient = () => {
    setAdditionalClients([
      ...additionalClients,
      {
        id: Math.random().toString(36).substring(7),
        name: "",
        phone: "",
        role: "Co-Petitioner",
      },
    ]);
  };

  const handleRemoveClient = (id: string) => {
    setAdditionalClients(additionalClients.filter((c) => c.id !== id));
  };

  const handleUpdateClient = (id: string, field: "name" | "phone" | "role", value: string) => {
    setAdditionalClients(
      additionalClients.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let finalCnr = "";
    let finalCaseNumber = "";
    let finalCourtName = "";
    let finalFilingYear = "";

    if (entryMode === "cnr") {
      finalCnr = cnr.trim().toUpperCase();
      if (!/^[A-Z0-9]{16}$/.test(finalCnr)) {
        setErrorMessage("CNR Number must be exactly 16 alphanumeric characters (e.g. MHTH070086142019).");
        return;
      }
    } else {
      if (!caseNumber.trim()) {
        setErrorMessage("Please enter the Case Number (e.g. 377 or WP/1024/2024).");
        return;
      }
      finalCaseNumber = caseNumber.trim();
      finalCourtName = courtSelection === "CUSTOM" ? customCourtName.trim() : courtSelection;
      if (!finalCourtName) {
        setErrorMessage("Please specify the Court Establishment.");
        return;
      }
      finalFilingYear = filingYear.trim() || String(new Date().getFullYear());
      finalCnr = derivedCnrPreview || generateCnrFromCaseDetails({
        caseNumber: finalCaseNumber,
        caseType: effectiveCaseType,
        filingYear: finalFilingYear,
        courtName: finalCourtName,
        state: selectedState,
        districtCode: currentDistrictObj?.code,
      });
    }

    setIsLoading(true);
    setCurrentStep("Connecting to eCourts Partner Registry...");

    try {
      const payload = {
        cnr: finalCnr,
        caseNumber: entryMode === "case_number" ? finalCaseNumber : undefined,
        caseType: entryMode === "case_number" ? effectiveCaseType : undefined,
        courtName: entryMode === "case_number" ? finalCourtName : undefined,
        filingYear: entryMode === "case_number" ? finalFilingYear : undefined,
        state: entryMode === "case_number" ? selectedState : undefined,
        lawyerName,
        lawyerPhone,
        clientName,
        clientWhatsAppNumber,
        firmId: selectedFirmId || activeFirm?.id || undefined,
        additionalLawyers: additionalLawyers
          .filter((l) => l.name.trim() && l.phone.trim())
          .map((l) => ({
            name: l.name.trim(),
            phone: l.phone.trim(),
            role: l.role.trim() || undefined,
          })),
        additionalClients: additionalClients
          .filter((c) => c.name.trim() && c.phone.trim())
          .map((c) => ({
            name: c.name.trim(),
            phone: c.phone.trim(),
            role: c.role.trim() || undefined,
          })),
      };

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Chamber Overview
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Track New Court Case
          </h1>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-md border border-neutral-300 bg-neutral-50 text-xs font-mono text-neutral-900">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {/* Active Chamber Identification & Lock */}
          {activeFirm && (
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-neutral-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-black">
                    Representing Law Firm
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Chamber Workspace Locked
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-black text-sm">{activeFirm.name}</span>
                <span className="text-neutral-500 font-mono text-[11px]">
                  ID: {activeFirm.slug} {activeFirm.leadAdvocate ? `· Lead: ${activeFirm.leadAdvocate}` : ""}
                </span>
              </div>
            </div>
          )}

          {/* Case Identification Mode Tabs */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-black">
                Case Identification Method *
              </label>
              <span className="text-[11px] font-mono text-neutral-500">
                Choose how you want to look up this court matter
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntryMode("cnr")}
                disabled={isLoading}
                className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  entryMode === "cnr"
                    ? "border-black bg-neutral-50 ring-1 ring-black"
                    : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-600"
                }`}
              >
                <div
                  className={`p-2 rounded-md ${
                    entryMode === "cnr" ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-black flex items-center gap-1.5">
                    Search with CNR Number
                    {entryMode === "cnr" && (
                      <span className="text-[10px] bg-black text-white px-1.5 py-0.2 rounded font-mono font-normal">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                    Official 16-digit eCourts code (e.g. MHTH070086142019)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEntryMode("case_number")}
                disabled={isLoading}
                className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  entryMode === "case_number"
                    ? "border-black bg-neutral-50 ring-1 ring-black"
                    : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-600"
                }`}
              >
                <div
                  className={`p-2 rounded-md ${
                    entryMode === "case_number" ? "bg-black text-white" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-black flex items-center gap-1.5">
                    Search with Case Number
                    {entryMode === "case_number" && (
                      <span className="text-[10px] bg-black text-white px-1.5 py-0.2 rounded font-mono font-normal">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                    Case Type, Number, Filing Year & Court Establishment
                  </div>
                </div>
              </button>
            </div>

            {/* CNR Mode Fields */}
            {entryMode === "cnr" && (
              <div className="space-y-1.5 p-4 rounded-lg border border-neutral-200 bg-neutral-50/50">
                <label htmlFor="cnr" className="block text-xs font-bold uppercase tracking-wider text-black">
                  Case CNR Number (16 Characters) *
                </label>
                <input
                  id="cnr"
                  type="text"
                  required={entryMode === "cnr"}
                  maxLength={16}
                  value={cnr}
                  onChange={(e) => setCnr(e.target.value.toUpperCase())}
                  placeholder="DLND020047882015"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-md font-mono text-sm tracking-wider text-black placeholder-neutral-400 focus:outline-none focus:border-black bg-white"
                  disabled={isLoading}
                />
                <p className="text-[11px] font-mono text-neutral-500">
                  Unique 16-character court identification code from official eCourts receipt, summons, or cause list.
                </p>
              </div>
            )}

            {/* Case Number Mode Fields */}
            {entryMode === "case_number" && (
              <div className="p-4 sm:p-5 rounded-lg border border-neutral-200 bg-neutral-50/60 space-y-5">
                {/* Section 1: Geographic Jurisdiction (State & District) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] inline-flex items-center justify-center font-mono">1</span>
                      Choose State & District Jurisdiction
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      Step 1 of 2
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. State Selector */}
                    <div className="space-y-1.5">
                      <label htmlFor="selectedState" className="block text-xs font-bold uppercase tracking-wider text-neutral-800">
                        State / Jurisdiction *
                      </label>
                      <select
                        id="selectedState"
                        value={selectedState}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-md text-xs font-medium text-black focus:outline-none focus:border-black bg-white"
                        disabled={isLoading}
                      >
                        {INDIAN_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] font-mono text-neutral-500">
                        Select State, National Bench, or Union Territory
                      </p>
                    </div>

                    {/* 2. District Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="selectedDistrict" className="block text-xs font-bold uppercase tracking-wider text-neutral-800">
                          District Jurisdiction *
                        </label>
                        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                          {availableDistricts.length} Districts Available
                        </span>
                      </div>
                      <select
                        id="selectedDistrict"
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-md text-xs font-medium text-black focus:outline-none focus:border-black bg-white"
                        disabled={isLoading || availableDistricts.length === 0}
                      >
                        {availableDistricts.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name} ({d.courts.length} Courts)
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] font-mono text-neutral-500">
                        Filter establishments by district jurisdiction
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Inside State & District - Court Establishment & Case Type */}
                <div className="p-4 sm:p-5 rounded-md border border-neutral-200 bg-white shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] inline-flex items-center justify-center font-mono">2</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-black">
                        Court Establishment & Case Specifications
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-neutral-700 bg-neutral-50 px-2.5 py-1 rounded border border-neutral-200">
                      <span>Jurisdiction:</span>
                      <span className="font-bold text-black">{selectedDistrict}</span>
                      <span>·</span>
                      <span className="text-neutral-600">{STATE_DISTRICT_HIERARCHY.find((s) => s.code === selectedState)?.name}</span>
                    </div>
                  </div>

                  {/* Court Establishment in this District */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label htmlFor="courtSelection" className="block text-xs font-bold uppercase tracking-wider text-black">
                        Court Establishment / Complex *
                      </label>
                      <span className="text-[11px] font-mono text-neutral-500">
                        All {availableCourts.length} Establishments in {selectedDistrict}
                      </span>
                    </div>

                    {/* Filter search bar for courts if there are multiple */}
                    {availableCourts.length > 4 && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={courtSearchQuery}
                          onChange={(e) => setCourtSearchQuery(e.target.value)}
                          placeholder={`Filter establishments in ${selectedDistrict}...`}
                          className="w-full pl-9 pr-7 py-1.5 text-xs rounded-md border border-neutral-200 focus:outline-none focus:border-black bg-neutral-50"
                        />
                        {courtSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCourtSearchQuery("")}
                            className="absolute right-2.5 top-2 text-neutral-400 hover:text-black text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    {/* Court Select Dropdown containing all options */}
                    <select
                      id="courtSelection"
                      value={courtSelection}
                      onChange={(e) => setCourtSelection(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black bg-white"
                      disabled={isLoading}
                    >
                      {filteredDistrictCourts.length > 0 ? (
                        filteredDistrictCourts.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      ) : (
                        <option value="CUSTOM">No establishment match - Enter Custom</option>
                      )}
                      <option value="CUSTOM">-- Enter Custom / Other Court Establishment --</option>
                    </select>

                    {courtSelection === "CUSTOM" && (
                      <input
                        type="text"
                        required
                        value={customCourtName}
                        onChange={(e) => setCustomCourtName(e.target.value)}
                        placeholder={`e.g. Civil Court Junior Division, ${selectedDistrict}`}
                        className="w-full px-3.5 py-2 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black bg-white"
                        disabled={isLoading}
                      />
                    )}
                  </div>

                  {/* Matter Details Grid: Case Type, Case Number, Filing Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Case Type */}
                    <div className="space-y-1 sm:col-span-1">
                      <label htmlFor="caseType" className="block text-xs font-bold uppercase tracking-wider text-black">
                        Case Type *
                      </label>
                      <select
                        id="caseType"
                        value={caseType}
                        onChange={(e) => setCaseType(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black bg-white"
                        disabled={isLoading}
                      >
                        {Object.entries(caseTypesByGroup).map(([group, types]) => (
                          <optgroup key={group} label={group}>
                            {types.map((t, idx) => (
                              <option key={`${t.code}-${idx}`} value={t.code}>
                                {t.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {caseType === "OTHER" && (
                        <input
                          type="text"
                          required
                          value={customCaseType}
                          onChange={(e) => setCustomCaseType(e.target.value)}
                          placeholder="e.g. Commercial Suit / Summary Suit"
                          className="w-full mt-1.5 px-3 py-1.5 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black bg-white"
                          disabled={isLoading}
                        />
                      )}
                    </div>

                    {/* Case Number */}
                    <div className="space-y-1 sm:col-span-1">
                      <label htmlFor="caseNumber" className="block text-xs font-bold uppercase tracking-wider text-black">
                        Case Number *
                      </label>
                      <input
                        id="caseNumber"
                        type="text"
                        required={entryMode === "case_number"}
                        value={caseNumber}
                        onChange={(e) => setCaseNumber(e.target.value)}
                        placeholder="e.g. 377 or CS/377/2019"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black bg-white"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Filing / Registration Year */}
                    <div className="space-y-1 sm:col-span-1">
                      <label htmlFor="filingYear" className="block text-xs font-bold uppercase tracking-wider text-black">
                        Filing Year *
                      </label>
                      <input
                        id="filingYear"
                        type="number"
                        required={entryMode === "case_number"}
                        min={1970}
                        max={2030}
                        value={filingYear}
                        onChange={(e) => setFilingYear(e.target.value)}
                        placeholder="2019"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono text-xs text-black focus:outline-none focus:border-black bg-white"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Derived CNR Preview Box */}
                  {derivedCnrPreview && (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
                        <span className="font-mono text-neutral-600">Standardized eCourts CNR:</span>
                        <span className="font-mono font-bold text-black bg-white px-2 py-0.5 rounded border border-neutral-200 tracking-wider">
                          {derivedCnrPreview}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto shrink-0">
                        Resolved: {selectedState} / {currentDistrictObj?.code || "TH"} / {filingYear}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lawyer & Client Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-neutral-100">
            {/* Lawyer Contacts Box */}
            <div className="space-y-4 p-4 rounded-lg border border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-neutral-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-black">
                    Advocate Contacts ({1 + additionalLawyers.length})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 bg-white border border-neutral-200 px-2 py-0.5 rounded">
                  Receives Court Updates
                </span>
              </div>

              {/* Primary Lawyer */}
              <div className="p-3 bg-white rounded-md border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span className="font-semibold text-black uppercase">Primary / Arguing Counsel</span>
                  <span>Required</span>
                </div>

                <div className="space-y-1">
                  <label htmlFor="lawyerName" className="block text-[11px] font-mono text-neutral-500">
                    Advocate Name
                  </label>
                  <input
                    id="lawyerName"
                    type="text"
                    required
                    value={lawyerName}
                    onChange={(e) => setLawyerName(e.target.value)}
                    placeholder="e.g. Adv. Nileema Saranga"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="lawyerPhone" className="block text-[11px] font-mono text-neutral-500">
                    WhatsApp Number
                  </label>
                  <input
                    id="lawyerPhone"
                    type="text"
                    required
                    value={lawyerPhone}
                    onChange={(e) => setLawyerPhone(e.target.value)}
                    placeholder="e.g. +91 98200 11223"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono text-xs text-black focus:outline-none focus:border-black"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Additional Lawyers List */}
              {additionalLawyers.map((lawyer, index) => (
                <div
                  key={lawyer.id}
                  className="p-3 bg-white rounded-md border border-neutral-200 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-semibold text-neutral-700">
                      Co-Advocate #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLawyer(lawyer.id)}
                      className="text-neutral-400 hover:text-red-600 transition-colors inline-flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-neutral-500">
                        Advocate Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lawyer.name}
                        onChange={(e) => handleUpdateLawyer(lawyer.id, "name", e.target.value)}
                        placeholder="e.g. Adv. R. K. Gupta"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-neutral-500">
                        Role / Designation
                      </label>
                      <select
                        value={lawyer.role}
                        onChange={(e) => handleUpdateLawyer(lawyer.id, "role", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-xs text-black bg-white focus:outline-none focus:border-black"
                        disabled={isLoading}
                      >
                        <option value="Junior Advocate">Junior Advocate</option>
                        <option value="Briefing Counsel">Briefing Counsel</option>
                        <option value="Associate Advocate">Associate Advocate</option>
                        <option value="Chamber Clerk">Chamber Clerk</option>
                        <option value="Senior Counsel">Senior Counsel</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-neutral-500">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      required
                      value={lawyer.phone}
                      onChange={(e) => handleUpdateLawyer(lawyer.id, "phone", e.target.value)}
                      placeholder="e.g. +91 98111 22334"
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md font-mono text-xs text-black focus:outline-none focus:border-black"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddLawyer}
                className="w-full py-2 px-3 border border-dashed border-neutral-300 hover:border-black rounded-md text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-50 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Lawyer Contacts (Junior, Clerk, Associate)</span>
              </button>
            </div>

            {/* Client Contacts Box */}
            <div className="space-y-4 p-4 rounded-lg border border-neutral-200 bg-neutral-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-neutral-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-black">
                    Client Contacts ({1 + additionalClients.length})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 bg-white border border-neutral-200 px-2 py-0.5 rounded">
                  WhatsApp Dispatches
                </span>
              </div>

              {/* Primary Client */}
              <div className="p-3 bg-white rounded-md border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span className="font-semibold text-black uppercase">Primary Litigant</span>
                  <span>Required</span>
                </div>

                <div className="space-y-1">
                  <label htmlFor="clientName" className="block text-[11px] font-mono text-neutral-500">
                    Client Name
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="clientWhatsAppNumber" className="block text-[11px] font-mono text-neutral-500">
                    WhatsApp Number
                  </label>
                  <input
                    id="clientWhatsAppNumber"
                    type="text"
                    required
                    value={clientWhatsAppNumber}
                    onChange={(e) => setClientWhatsAppNumber(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md font-mono text-xs text-black focus:outline-none focus:border-black"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Additional Clients List */}
              {additionalClients.map((client, index) => (
                <div
                  key={client.id}
                  className="p-3 bg-white rounded-md border border-neutral-200 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-semibold text-neutral-700">
                      Co-Litigant Contact #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveClient(client.id)}
                      className="text-neutral-400 hover:text-red-600 transition-colors inline-flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-neutral-500">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        required
                        value={client.name}
                        onChange={(e) => handleUpdateClient(client.id, "name", e.target.value)}
                        placeholder="e.g. Anita Verma"
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-xs text-black focus:outline-none focus:border-black"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-neutral-500">
                        Relationship / Role
                      </label>
                      <select
                        value={client.role}
                        onChange={(e) => handleUpdateClient(client.id, "role", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-xs text-black bg-white focus:outline-none focus:border-black"
                        disabled={isLoading}
                      >
                        <option value="Co-Petitioner">Co-Petitioner</option>
                        <option value="Co-Respondent">Co-Respondent</option>
                        <option value="Authorized Signatory">Authorized Signatory</option>
                        <option value="Legal Heir / Family">Legal Heir / Family</option>
                        <option value="Corporate Representative">Corporate Representative</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-neutral-500">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      required
                      value={client.phone}
                      onChange={(e) => handleUpdateClient(client.id, "phone", e.target.value)}
                      placeholder="e.g. +91 98765 11223"
                      className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md font-mono text-xs text-black focus:outline-none focus:border-black"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddClient}
                className="w-full py-2 px-3 border border-dashed border-neutral-300 hover:border-black rounded-md text-xs font-semibold text-neutral-700 hover:text-black bg-white hover:bg-neutral-50 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Client Contacts (Co-Litigant, Heir, Signatory)</span>
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[11px] font-mono text-neutral-400">
              {currentStep || "WhatsApp updates will automatically reach all configured advocates and clients."}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-medium px-6 py-2.5 rounded-md text-xs transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{currentStep || "Connecting..."}</span>
                </>
              ) : (
                <>
                  <span>Begin Tracking Case</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
