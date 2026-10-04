import { NormalizedCaseData } from "../ecourts/types";
import { DetectedChangeEvent, ChangeDetectionResult } from "./types";

/**
 * Compares two normalized case snapshots and returns structured update events.
 * Only returns events when real changes occur.
 */
export function detectCaseChanges(
  previousData: NormalizedCaseData,
  newData: NormalizedCaseData
): ChangeDetectionResult {
  const events: DetectedChangeEvent[] = [];

  // 1. Next Hearing Date Changed
  const prevNextDate = previousData.nextHearingDate || null;
  const newNextDate = newData.nextHearingDate || null;
  if (prevNextDate !== newNextDate && newNextDate !== null) {
    events.push({
      type: "NEXT_HEARING_DATE_CHANGED",
      description: prevNextDate
        ? `Next hearing date updated: ${prevNextDate} → ${newNextDate}`
        : `Next hearing scheduled for ${newNextDate}`,
      previousValue: prevNextDate,
      newValue: newNextDate,
    });
  }

  // 2. Case Stage Changed
  const prevStage = (previousData.stage || "").trim();
  const newStage = (newData.stage || "").trim();
  if (prevStage.toLowerCase() !== newStage.toLowerCase() && newStage) {
    events.push({
      type: "CASE_STAGE_CHANGED",
      description: prevStage
        ? `Case stage moved from "${prevStage}" to "${newStage}"`
        : `Case stage updated to "${newStage}"`,
      previousValue: prevStage,
      newValue: newStage,
    });
  }

  // 3. New Order Detected
  const prevOrderCount = previousData.orderCount || 0;
  const newOrderCount = newData.orderCount || 0;
  const prevOrderUrl = previousData.latestOrder?.orderUrl;
  const newOrderUrl = newData.latestOrder?.orderUrl;

  if (newOrderCount > prevOrderCount || (newOrderUrl && newOrderUrl !== prevOrderUrl)) {
    const orderDesc = newData.latestOrder?.description || "Court Order / Judgment";
    const orderDate = newData.latestOrder?.orderDate ? ` dated ${newData.latestOrder.orderDate}` : "";
    events.push({
      type: "NEW_ORDER",
      description: `New court order uploaded${orderDate} (${orderDesc})`,
      previousValue: previousData.latestOrder ?? { orderCount: prevOrderCount },
      newValue: newData.latestOrder ?? { orderCount: newOrderCount },
      metadata: {
        orderCountDiff: newOrderCount - prevOrderCount,
        orderUrl: newOrderUrl,
      },
    });
  }

  // 4. New Hearing Recorded
  const prevHearingCount = previousData.hearingCount || 0;
  const newHearingCount = newData.hearingCount || 0;
  const prevHearingDate = previousData.latestHearing?.hearingDate;
  const newHearingDate = newData.latestHearing?.hearingDate;

  if (newHearingCount > prevHearingCount || (newHearingDate && newHearingDate !== prevHearingDate)) {
    const purpose = newData.latestHearing?.purposeOfListing ? ` for ${newData.latestHearing.purposeOfListing}` : "";
    events.push({
      type: "NEW_HEARING",
      description: `New hearing entry recorded on ${newData.latestHearing?.businessOnDate || "court register"}${purpose}`,
      previousValue: previousData.latestHearing ?? { hearingCount: prevHearingCount },
      newValue: newData.latestHearing ?? { hearingCount: newHearingCount },
    });
  }

  // 5. New Judicial Proceeding / Business
  const prevProceedingDate = previousData.latestProceeding?.date;
  const newProceedingDate = newData.latestProceeding?.date;
  const prevBusiness = previousData.latestProceeding?.business;
  const newBusiness = newData.latestProceeding?.business;

  if (
    (newProceedingDate && newProceedingDate !== prevProceedingDate) ||
    (newBusiness && newBusiness !== prevBusiness)
  ) {
    events.push({
      type: "NEW_PROCEEDING",
      description: `Court proceeding updated: ${newData.latestProceeding?.business?.slice(0, 100) || "New business on date recorded"}`,
      previousValue: previousData.latestProceeding,
      newValue: newData.latestProceeding,
    });
  }

  // 6. Case Status Changed / Case Decided
  const prevStatus = (previousData.caseStatus || "").trim().toUpperCase();
  const newStatus = (newData.caseStatus || "").trim().toUpperCase();
  const prevDecisionDate = previousData.decisionDate;
  const newDecisionDate = newData.decisionDate;

  const isNowDecided =
    (newStatus === "DISPOSED" && prevStatus !== "DISPOSED") ||
    (newDecisionDate && !prevDecisionDate);

  if (isNowDecided) {
    events.push({
      type: "CASE_DECIDED",
      description: `Case marked as DISPOSED / DECIDED on ${newDecisionDate || "court record"}.`,
      previousValue: { caseStatus: prevStatus, decisionDate: prevDecisionDate },
      newValue: { caseStatus: newStatus, decisionDate: newDecisionDate },
    });
  } else if (prevStatus !== newStatus && newStatus) {
    events.push({
      type: "CASE_STATUS_CHANGED",
      description: `Case status changed from ${prevStatus || "UNKNOWN"} to ${newStatus}`,
      previousValue: prevStatus,
      newValue: newStatus,
    });
  }

  // 7. General Case Update if other fields changed and no specific event fired
  if (events.length === 0) {
    const prevLastHearing = previousData.lastHearingDate;
    const newLastHearing = newData.lastHearingDate;
    if (prevLastHearing !== newLastHearing && newLastHearing) {
      events.push({
        type: "GENERAL_CASE_UPDATE",
        description: `Case details updated: last hearing recorded as ${newLastHearing}`,
        previousValue: prevLastHearing,
        newValue: newLastHearing,
      });
    }
  }

  return {
    hasChanges: events.length > 0,
    events,
    previousSnapshot: previousData,
    newSnapshot: newData,
  };
}
