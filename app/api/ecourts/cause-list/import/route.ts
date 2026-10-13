import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FIRM_COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/firm-session";
import { CauseListEntry } from "@/lib/ecourts/cause-list";
import { calculateSnapshotHash } from "@/lib/ecourts/normalize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();
    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot register new cases." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      matters = [],
      assignedLawyerName,
      assignedLawyerPhone,
      firmId: bodyFirmId,
    } = body as {
      matters: CauseListEntry[];
      assignedLawyerName?: string;
      assignedLawyerPhone?: string;
      firmId?: string;
    };

    if (!Array.isArray(matters) || matters.length === 0) {
      return NextResponse.json(
        { error: "No cause list matters selected for import." },
        { status: 400 }
      );
    }

    // Determine active firm
    const effectiveFirmId =
      bodyFirmId || req.cookies.get(FIRM_COOKIE_NAME)?.value || null;

    let targetFirm = null;
    if (effectiveFirmId) {
      targetFirm = await prisma.firm.findUnique({ where: { id: effectiveFirmId } });
    }
    if (!targetFirm) {
      targetFirm = await prisma.firm.findFirst({ orderBy: { createdAt: "asc" } });
    }

    const firmId = targetFirm?.id || null;

    const importedCases: any[] = [];
    const skippedCases: any[] = [];

    for (const matter of matters) {
      const cnr = matter.cnr.trim().toUpperCase();

      // Check if case with this CNR already exists under this firm
      const existing = await prisma.case.findFirst({
        where: {
          firmId,
          OR: [{ cnr }, { caseNumber: matter.caseNumber }],
        },
      });

      if (existing) {
        skippedCases.push({
          caseNumber: matter.caseNumber,
          cnr,
          reason: "Already registered in this chamber",
        });
        continue;
      }

      // Lawyer assignment: use custom assigned lawyer, or the advocate in cause list, or firm lead advocate
      const lawyerName =
        assignedLawyerName?.trim() ||
        (matter.petitionerAdvocate?.toLowerCase().includes("nalawade") ||
        matter.petitionerAdvocate?.toLowerCase().includes("patwari")
          ? matter.petitionerAdvocate
          : matter.respondentAdvocate?.toLowerCase().includes("nalawade") ||
            matter.respondentAdvocate?.toLowerCase().includes("patwari")
          ? matter.respondentAdvocate
          : matter.petitionerAdvocate ||
            targetFirm?.leadAdvocate ||
            "Adv. Ketan Nalawade");

      const lawyerPhone =
        assignedLawyerPhone?.trim() ||
        targetFirm?.contactPhone ||
        "+919820012345";

      // Client name: petitioner or respondent
      const clientName = matter.petitioner || "Client Party";
      const clientPhone = "+919800000000"; // default placeholder for client whatsapp

      // Extract filing year from case number or CNR
      const yearMatch =
        matter.caseNumber.match(/\b(19\d{2}|20\d{2})\b/) ||
        matter.cnr.match(/\d{4}$/);
      const filingYear = yearMatch ? yearMatch[0] : String(new Date().getFullYear());

      // Prepare snapshot importantFields
      const importantFields = {
        cnr,
        caseNumber: matter.caseNumber,
        courtName: matter.courtName,
        caseStatus: "PENDING",
        nextHearingDate: matter.listingDate,
        lastHearingDate: null,
        decisionDate: null,
        stage: matter.stage,
        hearingCount: 1,
        orderCount: 0,
        petitioners: [matter.petitioner],
        respondents: [matter.respondent],
        advocates: [matter.petitionerAdvocate, matter.respondentAdvocate].filter(Boolean),
        judges: [matter.judgeName],
        latestHearing: {
          judge: matter.judgeName,
          hearingDate: matter.listingDate,
          purposeOfListing: matter.stage,
          businessOnDate: matter.businessOnDate || "Listed for hearing on daily board",
        },
        latestOrder: null,
        latestProceeding: null,
      };

      const snapshotHash = calculateSnapshotHash(importantFields);

      // Create records in transaction
      const created = await prisma.$transaction(async (tx) => {
        const lawyer = await tx.lawyer.create({
          data: {
            name: lawyerName,
            phone: lawyerPhone,
          },
        });

        const client = await tx.client.create({
          data: {
            name: clientName,
            whatsappNumber: clientPhone,
          },
        });

        const newCase = await tx.case.create({
          data: {
            cnr,
            lawyerId: lawyer.id,
            clientId: client.id,
            firmId,
            courtName: matter.courtName,
            caseNumber: matter.caseNumber,
            filingYear,
            lastCheckedAt: new Date(),
            monitoringEnabled: true,
          },
        });

        const snapshot = await tx.caseSnapshot.create({
          data: {
            caseId: newCase.id,
            snapshotHash,
            rawData: {
              source: "eCourts Daily Cause List",
              importedAt: new Date().toISOString(),
              causeListEntry: matter as any,
            },
            importantFields: importantFields as any,
          },
        });

        return newCase;
      });

      importedCases.push({
        id: created.id,
        caseNumber: created.caseNumber,
        cnr: created.cnr,
        courtName: created.courtName,
      });
    }

    return NextResponse.json({
      success: true,
      importedCount: importedCases.length,
      skippedCount: skippedCases.length,
      importedCases,
      skippedCases,
      firmName: targetFirm?.name || "Chamber",
    });
  } catch (error: any) {
    console.error("[POST /api/ecourts/cause-list/import] Error importing:", error);
    return NextResponse.json(
      { error: "Failed to import cause list matters into firm", details: error.message },
      { status: 500 }
    );
  }
}
