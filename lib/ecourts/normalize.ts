import crypto from "crypto";
import {
  ECourtsCaseDetailResponse,
  ECourtsCourtCaseData,
  NormalizedCaseData,
  ECourtsHearingHistoryEntry,
  ECourtsOrderEntry,
  ECourtsBusinessEntry,
} from "./types";

/**
 * Normalizes raw eCourtsIndia Partner API response into a stable, comparable object.
 * Handles nested fields whether data is passed as the full response { data: { courtCaseData: ... } }
 * or directly as courtCaseData.
 */
export function normalizeCaseData(rawData: unknown): NormalizedCaseData {
  if (!rawData || typeof rawData !== "object") {
    throw new Error("Invalid raw case data provided for normalization");
  }

  const responseObj = rawData as ECourtsCaseDetailResponse;
  const courtData: Partial<ECourtsCourtCaseData> =
    responseObj?.data?.courtCaseData ??
    (rawData as { courtCaseData?: ECourtsCourtCaseData })?.courtCaseData ??
    (rawData as ECourtsCourtCaseData);

  const entityInfo = responseObj?.data?.entityInfo;

  // Extract CNR
  const cnr = (courtData.cnr || entityInfo?.cnr || "").trim().toUpperCase();

  // Extract Case Number
  const caseNumber = (
    courtData.caseNumber ||
    courtData.registrationNumber ||
    courtData.filingNumber ||
    "N/A"
  ).trim();

  // Extract Court Name
  const courtName = (courtData.courtName || courtData.district || "eCourt").trim();

  // Extract Case Status
  const caseStatus = (courtData.caseStatus || "UNKNOWN").trim().toUpperCase();

  // Next hearing date: check courtData.nextHearingDate or entityInfo.nextDateOfHearing
  let nextHearingDate: string | null =
    courtData.nextHearingDate || entityInfo?.nextDateOfHearing || null;
  if (nextHearingDate) {
    // Standardize to YYYY-MM-DD
    const dateMatch = nextHearingDate.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      nextHearingDate = dateMatch[0];
    }
  }

  // Last hearing date
  let lastHearingDate: string | null =
    courtData.lastHearingDate || entityInfo?.lastDateOfHearing || null;
  if (lastHearingDate) {
    const dateMatch = lastHearingDate.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      lastHearingDate = dateMatch[0];
    }
  }

  // Decision Date
  let decisionDate: string | null = courtData.decisionDate || null;
  if (decisionDate) {
    const dateMatch = decisionDate.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      decisionDate = dateMatch[0];
    }
  }

  // Stage: typically purpose of listing or caseTypeSub
  const stage = (courtData.purpose || courtData.caseTypeSub || null)?.trim() || null;

  // Hearing history
  const hearings: ECourtsHearingHistoryEntry[] = Array.isArray(courtData.historyOfCaseHearings)
    ? courtData.historyOfCaseHearings
    : [];
  const hearingCount = courtData.hearingCount ?? hearings.length;

  const latestHearing: ECourtsHearingHistoryEntry | null =
    hearings.length > 0 ? hearings[hearings.length - 1] : null;

  // Orders: combine interimOrders and judgmentOrders if present
  const interimOrders = Array.isArray(courtData.interimOrders) ? courtData.interimOrders : [];
  const judgmentOrders = Array.isArray(courtData.judgmentOrders) ? courtData.judgmentOrders : [];
  const allOrders: ECourtsOrderEntry[] = [...interimOrders, ...judgmentOrders];

  const orderCount = courtData.orderCount ?? allOrders.length;
  const latestOrder: ECourtsOrderEntry | null =
    allOrders.length > 0 ? allOrders[allOrders.length - 1] : null;

  // Business / Proceedings entries
  const proceedings: ECourtsBusinessEntry[] = Array.isArray(courtData.businessOnDateEntries)
    ? courtData.businessOnDateEntries
    : [];
  const latestProceeding: ECourtsBusinessEntry | null =
    proceedings.length > 0 ? proceedings[proceedings.length - 1] : null;

  // Parties & advocates
  const petitioners = Array.isArray(courtData.petitioners) ? courtData.petitioners : [];
  const respondents = Array.isArray(courtData.respondents) ? courtData.respondents : [];
  const petAdv = Array.isArray(courtData.petitionerAdvocates) ? courtData.petitionerAdvocates : [];
  const respAdv = Array.isArray(courtData.respondentAdvocates) ? courtData.respondentAdvocates : [];
  const advocates = Array.from(new Set([...petAdv, ...respAdv]));
  const judges = Array.isArray(courtData.judges) ? courtData.judges : [];

  return {
    cnr,
    caseNumber,
    courtName,
    caseStatus,
    nextHearingDate,
    lastHearingDate,
    decisionDate,
    stage,
    hearingCount,
    orderCount,
    petitioners,
    respondents,
    advocates,
    judges,
    latestHearing,
    latestOrder,
    latestProceeding,
  };
}

/**
 * Computes a deterministic SHA-256 hash of normalized case data
 */
export function calculateSnapshotHash(normalizedData: NormalizedCaseData): string {
  const serialized = JSON.stringify(normalizedData, Object.keys(normalizedData).sort());
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
