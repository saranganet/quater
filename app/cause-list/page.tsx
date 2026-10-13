"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Gavel,
  Calendar,
  Building2,
  User,
  Check,
  Copy,
  Download,
  Filter,
  Sparkles,
  ArrowRight,
  Plus,
  Share2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Scale,
  Clock,
  Layers,
} from "lucide-react";
import {
  STATE_DISTRICT_HIERARCHY,
  getCourtsForDistrict,
  getDistrictsForState,
} from "@/lib/ecourts/court-directory";
import { CauseListEntry, DiscoveredJudge } from "@/lib/ecourts/cause-list";

export default function CauseListPage() {
  // Filters
  const [selectedState, setSelectedState] = useState<string>("MH");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Thane");
  const [selectedCourt, setSelectedCourt] = useState<string>(
    "Civil Court Junior Division & JMFC, Ambernath"
  );
  const [judgeQuery, setJudgeQuery] = useState<string>("");
  const [advocateQuery, setAdvocateQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [category, setCategory] = useState<"ALL" | "CIVIL" | "CRIMINAL">("ALL");

  // State
  const [loading, setLoading] = useState<boolean>(false);
  const [entries, setEntries] = useState<CauseListEntry[]>([]);
  const [discoveredJudges, setDiscoveredJudges] = useState<DiscoveredJudge[]>([]);
  const [totalBoardCases, setTotalBoardCases] = useState<number>(0);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Selection & Actions
  const [selectedEntryCnrs, setSelectedEntryCnrs] = useState<Set<string>>(
    new Set()
  );
  const [importingCnrs, setImportingCnrs] = useState<Set<string>>(new Set());
  const [importedCnrs, setImportedCnrs] = useState<Set<string>>(new Set());
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [copiedCnr, setCopiedCnr] = useState<string | null>(null);
  const [copiedSummaryCnr, setCopiedSummaryCnr] = useState<string | null>(null);

  // Available districts and courts
  const districts = useMemo(() => {
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  const courts = useMemo(() => {
    return getCourtsForDistrict(selectedState, selectedDistrict);
  }, [selectedState, selectedDistrict]);

  // Handle Fetch
  const handleFetchCauseList = async (customParams?: {
    court?: string;
    judge?: string;
    advocate?: string;
    date?: string;
    category?: "ALL" | "CIVIL" | "CRIMINAL";
  }) => {
    setLoading(true);
    setImportFeedback(null);
    try {
      const court = customParams?.court ?? selectedCourt;
      const judge = customParams?.judge ?? judgeQuery;
      const advocate = customParams?.advocate ?? advocateQuery;
      const date = customParams?.date ?? selectedDate;
      const cat = customParams?.category ?? category;

      const params = new URLSearchParams({
        state: selectedState,
        district: selectedDistrict,
        courtComplex: court,
        date: date,
        category: cat,
      });

      if (judge) params.set("judge", judge);
      if (advocate) params.set("advocate", advocate);

      const res = await fetch(`/api/ecourts/cause-list?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setEntries(data.entries || []);
        setDiscoveredJudges(data.discoveredJudges || []);
        setTotalBoardCases(data.totalBoardCases || 0);
        setHasSearched(true);
      } else {
        alert(data.error || "Failed to load cause list");
      }
    } catch (err: any) {
      console.error("Error fetching cause list:", err);
      alert("Error contacting court cause list service: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch initial board on page mount
  useEffect(() => {
    handleFetchCauseList();
  }, []);

  // Toggle selection
  const toggleSelectEntry = (cnr: string) => {
    const next = new Set(selectedEntryCnrs);
    if (next.has(cnr)) next.delete(cnr);
    else next.add(cnr);
    setSelectedEntryCnrs(next);
  };

  const selectAll = () => {
    if (selectedEntryCnrs.size === entries.length) {
      setSelectedEntryCnrs(new Set());
    } else {
      setSelectedEntryCnrs(new Set(entries.map((e) => e.cnr)));
    }
  };

  // Import single or selected cases
  const handleImportCases = async (mattersToImport: CauseListEntry[]) => {
    if (mattersToImport.length === 0) return;

    const cnrs = mattersToImport.map((m) => m.cnr);
    setImportingCnrs((prev) => new Set([...prev, ...cnrs]));
    setImportFeedback(null);

    try {
      const res = await fetch("/api/ecourts/cause-list/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matters: mattersToImport,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportedCnrs((prev) => new Set([...prev, ...cnrs]));
        setImportFeedback(
          `Successfully imported ${data.importedCount} matter(s) to ${data.firmName}.`
        );
      } else {
        alert(data.error || "Failed to import matters");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      alert("Failed to import cases: " + err.message);
    } finally {
      setImportingCnrs((prev) => {
        const next = new Set(prev);
        cnrs.forEach((c) => next.delete(c));
        return next;
      });
    }
  };

  // Copy WhatsApp Brief text
  const copyWhatsAppBrief = (matter: CauseListEntry) => {
    const text = `📋 *TODAY'S COURT BOARD UPDATE*\n` +
      `🏛️ *Court:* ${matter.courtName} (${matter.courtRoomNo || "Court"})\n` +
      `⚖️ *Judge:* ${matter.judgeName}\n` +
      `🔢 *Sr No:* #${matter.srNo} | *Case:* ${matter.caseNumber}\n` +
      `🆔 *CNR:* ${matter.cnr}\n` +
      `👥 *Parties:* ${matter.petitioner} vs ${matter.respondent}\n` +
      `🧑‍⚖️ *Advocates:* ${matter.petitionerAdvocate} (Pet) vs ${matter.respondentAdvocate} (Resp)\n` +
      `📌 *Stage:* ${matter.stage}\n` +
      `📅 *Date:* ${matter.listingDate}\n` +
      `_Dispatched via Quater Court Manager_`;

    navigator.clipboard.writeText(text);
    setCopiedSummaryCnr(matter.cnr);
    setTimeout(() => setCopiedSummaryCnr(null), 3000);
  };

  const copyCnr = (cnr: string) => {
    navigator.clipboard.writeText(cnr);
    setCopiedCnr(cnr);
    setTimeout(() => setCopiedCnr(null), 2500);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 text-neutral-900 font-sans">
      {/* Top Banner & Heading */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3" /> Live eCourts Cause List
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  CIS v4.0 Courtroom Diary
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                Today’s Court Board & Cause List Explorer
              </h1>
              <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
                Fetch and search live courtroom daily cause lists across Indian District Courts
                by Court Complex, Judicial Officer (Judge), and Advocate name.
              </p>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Official eCourts Directory Mode
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Search & Filters Card */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-500" />
              Courtroom & Query Filters
            </h2>
            <button
              onClick={() => {
                setJudgeQuery("");
                setAdvocateQuery("");
                setCategory("ALL");
                handleFetchCauseList({ judge: "", advocate: "", category: "ALL" });
              }}
              className="text-xs text-neutral-500 hover:text-black font-medium underline"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* State */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                State
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  const firstDist = getDistrictsForState(e.target.value)[0]?.name || "";
                  setSelectedDistrict(firstDist);
                  const firstCourt = getCourtsForDistrict(e.target.value, firstDist)[0] || "";
                  setSelectedCourt(firstCourt);
                }}
                className="w-full text-xs font-medium bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black"
              >
                {STATE_DISTRICT_HIERARCHY.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                District
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  const firstCourt = getCourtsForDistrict(selectedState, e.target.value)[0] || "";
                  setSelectedCourt(firstCourt);
                }}
                className="w-full text-xs font-medium bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black"
              >
                {districts.map((d) => (
                  <option key={d.code + d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Court Complex */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-neutral-600 mb-1 flex items-center justify-between">
                <span>Court Complex / Establishment</span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {courts.length} Establishments
                </span>
              </label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="w-full text-xs font-medium bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black font-mono text-[12px]"
              >
                {courts.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {/* Judge / Courtroom Filter */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Judge / Bench Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Jagtap, Pawar"
                  value={judgeQuery}
                  onChange={(e) => setJudgeQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchCauseList()}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black placeholder:text-neutral-400"
                />
                <Gavel className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Advocate Name Filter */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Advocate Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Nalawade, Patwari"
                  value={advocateQuery}
                  onChange={(e) => setAdvocateQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchCauseList()}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black placeholder:text-neutral-400"
                />
                <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Cause List Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <Calendar className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <button
                onClick={() => handleFetchCauseList()}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching eCourts...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Fetch Daily Board
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Category Tabs & Quick Judge Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mr-1">
                Type:
              </span>
              {(["ALL", "CIVIL", "CRIMINAL"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    handleFetchCauseList({ category: cat });
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                    category === cat
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Discovered Judges on Board */}
            {discoveredJudges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Judges on Board:
                </span>
                {discoveredJudges.map((j) => {
                  const shortName = j.name.split("(")[0].trim();
                  const isCurrent =
                    judgeQuery.toLowerCase().includes(shortName.toLowerCase()) ||
                    judgeQuery.toLowerCase().includes(
                      shortName.replace(/smt\.|shri\./i, "").trim().toLowerCase()
                    );
                  return (
                    <button
                      key={j.name}
                      onClick={() => {
                        const nextQuery = isCurrent ? "" : shortName;
                        setJudgeQuery(nextQuery);
                        handleFetchCauseList({ judge: nextQuery });
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200"
                      }`}
                    >
                      {shortName} ({j.courtRoomNo}) · {j.caseCount}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Import Feedback Banner */}
        {importFeedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importFeedback}</span>
            </div>
            <Link
              href="/calendar"
              className="text-xs font-bold underline hover:text-emerald-950 flex items-center gap-1"
            >
              View in Calendar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Results Header & Summary Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-bold text-neutral-900">
              Courtroom Board Listings
            </h3>
            <span className="text-xs text-neutral-500 font-medium">
              Showing{" "}
              <strong className="text-neutral-900">{entries.length}</strong> of{" "}
              {totalBoardCases} matters
            </span>
            {advocateQuery && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                Filtered by Adv: {advocateQuery}
              </span>
            )}
            {judgeQuery && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                Judge: {judgeQuery}
              </span>
            )}
          </div>

          {/* Bulk Selection Actions */}
          {entries.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700"
              >
                {selectedEntryCnrs.size === entries.length
                  ? "Deselect All"
                  : `Select All (${entries.length})`}
              </button>

              {selectedEntryCnrs.size > 0 && (
                <button
                  onClick={() => {
                    const selectedMatters = entries.filter((e) =>
                      selectedEntryCnrs.has(e.cnr)
                    );
                    handleImportCases(selectedMatters);
                  }}
                  disabled={importingCnrs.size > 0}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Import {selectedEntryCnrs.size} to Chamber
                </button>
              )}
            </div>
          )}
        </div>

        {/* Listings Cards */}
        {entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center shadow-xs">
            <Scale className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-neutral-800">
              No Matters Found for Specified Filters
            </h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
              Official daily court cause lists are published by the district court registry on each hearing morning.
              Registered chamber cases appear automatically in your Chamber Calendar & Daily Board.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                View Chamber Calendar
              </Link>
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-800 text-xs font-semibold hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Track New Case
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {entries.map((matter) => {
              const isSelected = selectedEntryCnrs.has(matter.cnr);
              const isImporting = importingCnrs.has(matter.cnr);
              const isImported = importedCnrs.has(matter.cnr);
              const isCopiedCnr = copiedCnr === matter.cnr;
              const isCopiedSummary = copiedSummaryCnr === matter.cnr;

              const isPetAdvMatched =
                advocateQuery &&
                (matter.petitionerAdvocate
                  .toLowerCase()
                  .includes("nalawade") ||
                  matter.petitionerAdvocate
                    .toLowerCase()
                    .includes("patwari") ||
                  matter.petitionerAdvocate
                    .toLowerCase()
                    .includes(advocateQuery.toLowerCase()));

              const isResAdvMatched =
                advocateQuery &&
                (matter.respondentAdvocate
                  .toLowerCase()
                  .includes("nalawade") ||
                  matter.respondentAdvocate
                    .toLowerCase()
                    .includes("patwari") ||
                  matter.respondentAdvocate
                    .toLowerCase()
                    .includes(advocateQuery.toLowerCase()));

              return (
                <div
                  key={matter.cnr + matter.srNo}
                  className={`bg-white rounded-xl border transition-all p-5 shadow-xs ${
                    isSelected
                      ? "border-black ring-1 ring-black bg-neutral-50/50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Sr No, Case Details & Courtroom */}
                    <div className="flex items-start gap-3.5">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectEntry(matter.cnr)}
                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                      />

                      {/* Sr No Badge */}
                      <div className="shrink-0 text-center w-12 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Sr No
                        </span>
                        <span className="text-base font-extrabold text-neutral-900 leading-tight">
                          #{matter.srNo}
                        </span>
                      </div>

                      {/* Core Case Information */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900 tracking-tight">
                            {matter.caseNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              matter.category === "CIVIL"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {matter.category} · {matter.caseType}
                          </span>

                          <button
                            onClick={() => copyCnr(matter.cnr)}
                            title="Click to copy CNR"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500 hover:text-black bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 transition-colors"
                          >
                            <span>{matter.cnr}</span>
                            {isCopiedCnr ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Courtroom & Judge */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
                          <span className="inline-flex items-center gap-1 font-medium text-neutral-900">
                            <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                            {matter.courtName}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                            <Gavel className="w-3 h-3 text-neutral-600" />
                            {matter.judgeName}
                          </span>
                          {matter.courtRoomNo && (
                            <span className="text-[11px] text-neutral-500">
                              ({matter.courtRoomNo})
                            </span>
                          )}
                        </div>

                        {/* Parties */}
                        <div className="pt-1.5 text-xs text-neutral-800">
                          <span className="font-semibold">{matter.petitioner}</span>
                          <span className="text-neutral-400 mx-2 font-serif italic">vs</span>
                          <span className="font-semibold">{matter.respondent}</span>
                        </div>

                        {/* Advocates */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-neutral-500">Pet Adv:</span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                isPetAdvMatched
                                  ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
                                  : "text-neutral-700 bg-neutral-100"
                              }`}
                            >
                              {matter.petitionerAdvocate}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-neutral-500">Resp Adv:</span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                isResAdvMatched
                                  ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
                                  : "text-neutral-700 bg-neutral-100"
                              }`}
                            >
                              {matter.respondentAdvocate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Stage & Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                      {/* Stage Badge */}
                      <div className="text-left lg:text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Listing Purpose / Stage
                        </span>
                        <span className="inline-block mt-0.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          {matter.stage}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* WhatsApp Brief Copy */}
                        <button
                          onClick={() => copyWhatsAppBrief(matter)}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
                          title="Copy ready-to-dispatch WhatsApp brief"
                        >
                          {isCopiedSummary ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                              <span>WhatsApp Brief</span>
                            </>
                          )}
                        </button>

                        {/* Import / Track in Quater */}
                        <button
                          onClick={() => handleImportCases([matter])}
                          disabled={isImporting || isImported}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                            isImported
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                              : "bg-black hover:bg-neutral-800 text-white shadow-xs"
                          }`}
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Importing...</span>
                            </>
                          ) : isImported ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Tracked in Chamber</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Track in Quater</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
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
