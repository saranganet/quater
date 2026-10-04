import { NormalizedCaseData } from "../ecourts/types";

export type CaseEventType =
  | "CASE_STATUS_CHANGED"
  | "NEXT_HEARING_DATE_CHANGED"
  | "NEW_HEARING"
  | "NEW_ORDER"
  | "NEW_PROCEEDING"
  | "CASE_STAGE_CHANGED"
  | "CASE_DECIDED"
  | "GENERAL_CASE_UPDATE";

export interface DetectedChangeEvent {
  type: CaseEventType;
  description: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ChangeDetectionResult {
  hasChanges: boolean;
  events: DetectedChangeEvent[];
  previousSnapshot: NormalizedCaseData;
  newSnapshot: NormalizedCaseData;
}
