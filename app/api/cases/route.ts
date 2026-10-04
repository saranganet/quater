import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createCaseSchema } from "@/lib/validations/case";
import { ecourtsClient, ECourtsAPIError } from "@/lib/ecourts/client";
import { normalizeCaseData, calculateSnapshotHash } from "@/lib/ecourts/normalize";
import { getMockECourtsCase } from "@/lib/ecourts/mockData";

export async function GET() {
  try {
    const cases = await prisma.case.findMany({
      include: {
        lawyer: true,
        client: true,
        firm: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        events: {
          orderBy: { detectedAt: "desc" },
          take: 3,
        },
        _count: {
          select: { events: true, snapshots: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ cases });
  } catch (error: any) {
    console.error("[GET /api/cases] Error listing cases:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cases", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = createCaseSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          error: issue.message,
          field: issue.path.join("."),
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { cnr, lawyerName, lawyerPhone, clientName, clientWhatsAppNumber, firmId } =
      parseResult.data;

    // Check if case with this CNR already exists
    const existingCase = await prisma.case.findUnique({
      where: { cnr },
      include: { lawyer: true, client: true },
    });

    if (existingCase) {
      return NextResponse.json(
        {
          error: `Case with CNR ${cnr} is already registered in the system.`,
          existingCaseId: existingCase.id,
        },
        { status: 409 }
      );
    }

    // Retrieve case data from eCourtsIndia Partner API
    let rawCaseData: any = null;
    const apiKey = (process.env.ECOURTS_API_KEY || "").trim();

    if (apiKey) {
      try {
        console.log(`[eCourts] Fetching case details for CNR: ${cnr}`);
        rawCaseData = await ecourtsClient.getCase(cnr);
      } catch (err: any) {
        if (err instanceof ECourtsAPIError && (err.statusCode === 404 || err.errorCode === "NOT_FOUND")) {
          // Case not found in cache, trigger async refresh and poll
          console.log(`[eCourts] Case ${cnr} not found in cache. Triggering fresh refresh scrape...`);
          try {
            await ecourtsClient.refreshCase(cnr);
            rawCaseData = await ecourtsClient.pollCaseRefresh(cnr, {
              initialDelayMs: 5000,
              maxWaitMs: 30000,
              intervalMs: 3000,
            });
          } catch (pollErr: any) {
            return NextResponse.json(
              {
                error: `eCourts could not find or scrape case for CNR ${cnr}: ${pollErr.message}`,
                errorCode: pollErr.errorCode || "REFRESH_FAILED",
              },
              { status: 404 }
            );
          }
        } else {
          return NextResponse.json(
            {
              error: err.message || "Failed to fetch case from eCourtsIndia Partner API",
              errorCode: err.errorCode || "ECOURTS_ERROR",
            },
            { status: err.statusCode || 500 }
          );
        }
      }
    } else {
      // Local dev / demonstration mode without paid eCourts API key
      console.log(`[eCourts Mock] ECOURTS_API_KEY not configured. Generating realistic mock snapshot for CNR: ${cnr}`);
      rawCaseData = getMockECourtsCase(cnr);
    }

    // Normalize case data
    const normalizedData = normalizeCaseData(rawCaseData);
    const snapshotHash = calculateSnapshotHash(normalizedData);

    // Save Lawyer, Client, Case, and initial CaseSnapshot in database transaction
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
          whatsappNumber: clientWhatsAppNumber,
        },
      });

      // Extract filing year from CNR or registrationDate
      const filingYearMatch = cnr.match(/\d{4}$/);
      const filingYear = filingYearMatch ? filingYearMatch[0] : null;

      const newCase = await tx.case.create({
        data: {
          cnr,
          lawyerId: lawyer.id,
          clientId: client.id,
          firmId: firmId || null,
          courtName: normalizedData.courtName || "eCourt",
          caseNumber: normalizedData.caseNumber || "N/A",
          filingYear,
          lastCheckedAt: new Date(),
          monitoringEnabled: true,
        },
      });

      const snapshot = await tx.caseSnapshot.create({
        data: {
          caseId: newCase.id,
          snapshotHash,
          rawData: rawCaseData,
          importantFields: normalizedData as any,
        },
      });

      return { lawyer, client, case: newCase, snapshot };
    });

    return NextResponse.json({
      success: true,
      caseId: created.case.id,
      case: created.case,
      normalized: normalizedData,
      snapshotId: created.snapshot.id,
    });
  } catch (error: any) {
    console.error("[POST /api/cases] Error creating case:", error);
    return NextResponse.json(
      { error: "Failed to onboard case", details: error.message },
      { status: 500 }
    );
  }
}
