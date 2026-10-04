/**
 * Types for eCourtsIndia Partner API v4.0
 * Based on official eCourts API documentation: https://ecourtsindia.com/api/docs
 */

export interface ECourtsHearingHistoryEntry {
  judge?: string;
  businessOnDate?: string;
  hearingDate?: string;
  purposeOfListing?: string;
}

export interface ECourtsOrderEntry {
  orderDate?: string;
  orderType?: string;
  description?: string;
  orderUrl?: string; // e.g. "order-1.pdf"
}

export interface ECourtsBusinessEntry {
  date?: string;
  courtOf?: string;
  petitioner?: string;
  respondent?: string;
  business?: string;
  nextPurpose?: string;
  nextHearingDate?: string;
}

export interface ECourtsCourtCaseData {
  cnr: string;
  caseNumber?: string;
  courtName?: string;
  courtNo?: number | string;
  courtCode?: number | string;
  district?: string;
  state?: string;
  stateCode?: string;
  districtCode?: string;
  caseType?: string;
  caseTypeRaw?: string;
  caseTypeSub?: string;
  caseStatus?: string; // PENDING, DISPOSED, etc.
  filingNumber?: string;
  filingDate?: string;
  registrationNumber?: string;
  registrationDate?: string;
  firstHearingDate?: string;
  nextHearingDate?: string;
  lastHearingDate?: string;
  decisionDate?: string;
  purpose?: string;
  disposalType?: string;
  disposalTypeRaw?: string;
  contestedStatus?: string;
  judges?: string[];
  petitioners?: string[];
  petitionerAdvocates?: string[];
  respondents?: string[];
  respondentAdvocates?: string[];
  caseCategoryFacetPath?: string;
  hasOrders?: boolean;
  hasJudgments?: boolean;
  orderCount?: number;
  interimOrderCount?: number;
  judgmentCount?: number;
  hearingCount?: number;
  historyOfCaseHearings?: ECourtsHearingHistoryEntry[];
  interimOrders?: ECourtsOrderEntry[];
  judgmentOrders?: ECourtsOrderEntry[];
  businessOnDateEntries?: ECourtsBusinessEntry[];
  [key: string]: unknown;
}

export interface ECourtsEntityInfo {
  cnr?: string;
  nextDateOfHearing?: string;
  lastDateOfHearing?: string;
  dateCreated?: string;
  dateModified?: string;
  [key: string]: unknown;
}

export interface ECourtsCaseDetailResponse {
  data?: {
    courtCaseData?: ECourtsCourtCaseData;
    entityInfo?: ECourtsEntityInfo;
    files?: unknown;
    descriptions?: unknown;
    caseAiAnalysis?: unknown;
  };
  meta?: {
    request_id?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface ECourtsRefreshResponse {
  data?: {
    cnr?: string;
    status?: "QUEUED" | "PENDING" | "COMPLETED" | "FAILED" | string;
    message?: string;
    estimatedTime?: string;
  };
  meta?: {
    request_id?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

/**
 * Normalized Important Fields for change detection and clean display
 */
export interface NormalizedCaseData {
  cnr: string;
  caseNumber: string;
  courtName: string;
  caseStatus: string;
  nextHearingDate: string | null;
  lastHearingDate: string | null;
  decisionDate: string | null;
  stage: string | null; // from purpose or caseTypeSub
  hearingCount: number;
  orderCount: number;
  petitioners: string[];
  respondents: string[];
  advocates: string[];
  judges: string[];
  latestHearing: ECourtsHearingHistoryEntry | null;
  latestOrder: ECourtsOrderEntry | null;
  latestProceeding: ECourtsBusinessEntry | null;
}
