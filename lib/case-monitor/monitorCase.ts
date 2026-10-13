import prisma from "../prisma";
import { ecourtsClient } from "../ecourts/client";
import { normalizeCaseData, calculateSnapshotHash } from "../ecourts/normalize";
import { NormalizedCaseData } from "../ecourts/types";
import { detectCaseChanges } from "./detectChanges";
import { notificationService } from "../notifications/service";
import { DetectedChangeEvent } from "./types";

export interface MonitorCaseResult {
  success: boolean;
  hasChanges: boolean;
  events: DetectedChangeEvent[];
  message: string;
  checkedAt: Date;
  previousHash?: string;
  newHash?: string;
}

/**
 * Monitors a case:
 * 1. Retrieves CNR and previous snapshot
 * 2. Refreshes & polls latest data from eCourts
 * 3. Compares snapshots and detects meaningful changes
 * 4. Creates CaseEvent, CaseSnapshot, and dispatches notifications if changes found
 */
export async function monitorCase(caseId: string): Promise<MonitorCaseResult> {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      lawyer: true,
      client: true,
      firm: true,
      contacts: true,
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!caseRecord) {
    throw new Error(`Case with ID ${caseId} not found.`);
  }

  const latestSnapshot = caseRecord.snapshots[0];
  if (!latestSnapshot) {
    throw new Error(`Case ${caseRecord.cnr} has no initial snapshot. Cannot monitor.`);
  }

  const previousNormalized = latestSnapshot.importantFields as unknown as NormalizedCaseData;
  const previousHash = latestSnapshot.snapshotHash;

  // Retrieve fresh case data
  let rawNewData: any;
  const apiKey = (process.env.ECOURTS_API_KEY || "").trim();

  if (apiKey) {
    try {
      // 1. Request asynchronous refresh
      console.log(`[Monitor] Triggering refresh for CNR: ${caseRecord.cnr}`);
      await ecourtsClient.refreshCase(caseRecord.cnr);

      // 2. Poll for fresh data (with timeout and backoff)
      rawNewData = await ecourtsClient.pollCaseRefresh(caseRecord.cnr, {
        initialDelayMs: 4000,
        maxWaitMs: 25000,
        intervalMs: 3000,
        previousHash,
      });
    } catch (err: any) {
      console.warn(`[Monitor] eCourts refresh/poll failed (${err.message}). Falling back to direct GET.`);
      // If refresh endpoint errored, try direct GET as fallback
      rawNewData = await ecourtsClient.getCase(caseRecord.cnr);
    }
  } else {
    // If no API key configured, use existing rawData as stable baseline
    console.log(`[Monitor] ECOURTS_API_KEY not set. Using stored raw data baseline for CNR: ${caseRecord.cnr}`);
    rawNewData = latestSnapshot.rawData;
  }

  const newNormalized = normalizeCaseData(rawNewData);
  const newHash = calculateSnapshotHash(newNormalized);

  // Compare previous snapshot with new snapshot
  const detectionResult = detectCaseChanges(previousNormalized, newNormalized);

  const now = new Date();

  // If no changes detected
  if (!detectionResult.hasChanges || newHash === previousHash) {
    await prisma.case.update({
      where: { id: caseId },
      data: { lastCheckedAt: now },
    });

    return {
      success: true,
      hasChanges: false,
      events: [],
      message: "Case checked. No new updates or proceedings recorded.",
      checkedAt: now,
      previousHash,
      newHash,
    };
  }

  // Meaningful changes detected!
  console.log(`[Monitor] Detected ${detectionResult.events.length} update(s) for case ${caseRecord.cnr}`);

  // Create CaseEvent for each change and dispatch notifications
  for (const event of detectionResult.events) {
    const caseEvent = await prisma.caseEvent.create({
      data: {
        caseId: caseRecord.id,
        eventType: event.type,
        eventKey: event.eventKey || null,
        description: event.description,
        previousData: (event.previousValue as any) ?? null,
        newData: (event.newValue as any) ?? null,
        detectedAt: now,
        notificationStatus: "PENDING",
      },
    });

    // Check if the chamber has enabled MANUAL message dispatching
    if (caseRecord.firm?.dispatchMode === "MANUAL") {
      await prisma.caseEvent.update({
        where: { id: caseEvent.id },
        data: {
          notificationStatus: "PENDING_APPROVAL",
        },
      });
      console.log(
        `[Monitor] Chamber ${caseRecord.firm?.name || caseRecord.firmId} is in MANUAL dispatch mode. Event ${caseEvent.id} held as PENDING_APPROVAL for lawyer review.`
      );
      continue;
    }

    // Send notifications to both Lawyer and Client
    try {
      const notifResults = await notificationService.sendCaseUpdateNotification({
        caseEventId: caseEvent.id,
        caseId: caseRecord.id,
        cnr: caseRecord.cnr,
        caseNumber: caseRecord.caseNumber,
        courtName: newNormalized.courtName || caseRecord.courtName,
        changeDescription: event.description,
        eventKey: event.eventKey,
        nextHearingDate: newNormalized.nextHearingDate,
        firm: caseRecord.firm,
        recipients: [
          {
            type: "LAWYER",
            name: caseRecord.lawyer.name,
            phone: caseRecord.lawyer.phone,
          },
          {
            type: "CLIENT",
            name: caseRecord.client.name,
            phone: caseRecord.client.whatsappNumber,
          },
          ...(caseRecord.contacts || []).map((c) => ({
            type: c.type as "LAWYER" | "CLIENT",
            name: c.role ? `${c.name} (${c.role})` : c.name,
            phone: c.phone,
          })),
        ],
      });

      const isAllSkipped = notifResults.every((r) => r.status === "DUPLICATE_SKIPPED");
      const anySent = notifResults.some((r) => r.status === "SENT" || r.status === "MOCKED");
      const eventStatus = isAllSkipped ? "SKIPPED" : anySent ? "SENT" : "FAILED";

      await prisma.caseEvent.update({
        where: { id: caseEvent.id },
        data: {
          notificationStatus: eventStatus,
        },
      });
    } catch (notifErr: any) {
      console.error(`[Monitor] Error dispatching notifications for event ${caseEvent.id}:`, notifErr);
      await prisma.caseEvent.update({
        where: { id: caseEvent.id },
        data: { notificationStatus: "FAILED" },
      });
    }
  }

  // Create new snapshot
  await prisma.caseSnapshot.create({
    data: {
      caseId: caseRecord.id,
      snapshotHash: newHash,
      rawData: rawNewData,
      importantFields: newNormalized as any,
      createdAt: now,
    },
  });

  // Update Case metadata
  await prisma.case.update({
    where: { id: caseId },
    data: {
      lastCheckedAt: now,
      lastModifiedAt: now,
      courtName: newNormalized.courtName || caseRecord.courtName,
      caseNumber: newNormalized.caseNumber || caseRecord.caseNumber,
    },
  });

  return {
    success: true,
    hasChanges: true,
    events: detectionResult.events,
    message: `Detected ${detectionResult.events.length} case update(s). Notifications generated.`,
    checkedAt: now,
    previousHash,
    newHash,
  };
}

/**
 * Simulates a case update for testing change detection, events, and WhatsApp notifications
 * without requiring real judicial changes or making external eCourts requests.
 */
export async function simulateCaseUpdate(
  caseId: string,
  simulatedChanges: {
    nextHearingDate?: string;
    stage?: string;
    addOrder?: boolean;
    orderDescription?: string;
    caseStatus?: string;
  }
): Promise<MonitorCaseResult> {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      lawyer: true,
      client: true,
      firm: true,
      contacts: true,
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!caseRecord) {
    throw new Error(`Case with ID ${caseId} not found.`);
  }

  const latestSnapshot = caseRecord.snapshots[0];
  if (!latestSnapshot) {
    throw new Error("Case has no snapshot to simulate updates against.");
  }

  const previousNormalized = latestSnapshot.importantFields as unknown as NormalizedCaseData;
  const previousHash = latestSnapshot.snapshotHash;

  // Build modified normalized data based on simulation inputs
  const simulatedNormalized: NormalizedCaseData = {
    ...previousNormalized,
    nextHearingDate:
      simulatedChanges.nextHearingDate !== undefined
        ? simulatedChanges.nextHearingDate
        : previousNormalized.nextHearingDate,
    stage:
      simulatedChanges.stage !== undefined
        ? simulatedChanges.stage
        : previousNormalized.stage,
    caseStatus:
      simulatedChanges.caseStatus !== undefined
        ? simulatedChanges.caseStatus
        : previousNormalized.caseStatus,
  };

  if (simulatedChanges.addOrder) {
    simulatedNormalized.orderCount = (previousNormalized.orderCount || 0) + 1;
    simulatedNormalized.latestOrder = {
      orderDate: new Date().toISOString().split("T")[0],
      description: simulatedChanges.orderDescription || "SIMULATED COURT ORDER",
      orderUrl: `order-sim-${Date.now()}.pdf`,
    };
  }

  const newHash = calculateSnapshotHash(simulatedNormalized);
  const detectionResult = detectCaseChanges(previousNormalized, simulatedNormalized);

  if (!detectionResult.hasChanges) {
    return {
      success: true,
      hasChanges: false,
      events: [],
      message: "Simulation produced no changes compared to the current snapshot.",
      checkedAt: new Date(),
    };
  }

  const now = new Date();

  // Create CaseEvents and dispatch notifications
  for (const event of detectionResult.events) {
    const caseEvent = await prisma.caseEvent.create({
      data: {
        caseId: caseRecord.id,
        eventType: event.type,
        eventKey: event.eventKey || null,
        description: event.description,
        previousData: (event.previousValue as any) ?? null,
        newData: (event.newValue as any) ?? null,
        detectedAt: now,
        notificationStatus: "PENDING",
      },
    });

    try {
      const notifResults = await notificationService.sendCaseUpdateNotification({
        caseEventId: caseEvent.id,
        caseId: caseRecord.id,
        cnr: caseRecord.cnr,
        caseNumber: caseRecord.caseNumber,
        courtName: simulatedNormalized.courtName || caseRecord.courtName,
        changeDescription: event.description,
        eventKey: event.eventKey,
        nextHearingDate: simulatedNormalized.nextHearingDate,
        firm: caseRecord.firm,
        recipients: [
          {
            type: "LAWYER",
            name: caseRecord.lawyer.name,
            phone: caseRecord.lawyer.phone,
          },
          {
            type: "CLIENT",
            name: caseRecord.client.name,
            phone: caseRecord.client.whatsappNumber,
          },
          ...(caseRecord.contacts || []).map((c) => ({
            type: c.type as "LAWYER" | "CLIENT",
            name: c.role ? `${c.name} (${c.role})` : c.name,
            phone: c.phone,
          })),
        ],
      });

      const isAllSkipped = notifResults.every((r) => r.status === "DUPLICATE_SKIPPED");
      const anySent = notifResults.some((r) => r.status === "SENT" || r.status === "MOCKED");
      const eventStatus = isAllSkipped ? "SKIPPED" : anySent ? "SENT" : "FAILED";

      await prisma.caseEvent.update({
        where: { id: caseEvent.id },
        data: {
          notificationStatus: eventStatus,
        },
      });
    } catch (notifErr: any) {
      console.error("[Simulate] Notification error:", notifErr);
      await prisma.caseEvent.update({
        where: { id: caseEvent.id },
        data: { notificationStatus: "FAILED" },
      });
    }
  }

  // Create new snapshot reflecting simulation
  await prisma.caseSnapshot.create({
    data: {
      caseId: caseRecord.id,
      snapshotHash: newHash,
      rawData: {
        simulated: true,
        generatedAt: now.toISOString(),
        courtCaseData: simulatedNormalized,
      } as any,
      importantFields: simulatedNormalized as any,
      createdAt: now,
    },
  });

  await prisma.case.update({
    where: { id: caseId },
    data: {
      lastCheckedAt: now,
      lastModifiedAt: now,
    },
  });

  return {
    success: true,
    hasChanges: true,
    events: detectionResult.events,
    message: `Simulation applied ${detectionResult.events.length} update(s)!`,
    checkedAt: now,
    previousHash,
    newHash,
  };
}
