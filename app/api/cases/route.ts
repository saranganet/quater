import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createCaseSchema } from "@/lib/validations/case";
import { ecourtsClient, ECourtsAPIError } from "@/lib/ecourts/client";
import { normalizeCaseData, calculateSnapshotHash } from "@/lib/ecourts/normalize";
import { getMockECourtsCase } from "@/lib/ecourts/mockData";
import { FIRM_COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/firm-session";
import { generateCnrFromCaseDetails } from "@/lib/ecourts/cnr-generator";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const firmIdParam = url.searchParams.get("firmId");
    const activeFirmId = firmIdParam || req.cookies.get(FIRM_COOKIE_NAME)?.value || null;

    const whereClause: any = {};
    if (activeFirmId) {
      whereClause.firmId = activeFirmId;
    }

    const cases = await prisma.case.findMany({
      where: whereClause,
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
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();
    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot register new cases." },
        { status: 403 }
      );
    }

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

    const {
      cnr: rawCnr,
      caseNumber: rawCaseNumber,
      caseType,
      filingYear: rawFilingYear,
      courtName: rawCourtName,
      state,
      lawyerName,
      lawyerPhone,
      clientName,
      clientWhatsAppNumber,
      firmId,
      additionalLawyers,
      additionalClients,
    } = parseResult.data;

    const effectiveFirmId = firmId || req.cookies.get(FIRM_COOKIE_NAME)?.value || null;

    let cnr = (rawCnr || "").trim().toUpperCase();
    let caseNumber = (rawCaseNumber || "").trim();
    let filingYear = (rawFilingYear || "").trim();
    let courtName = (rawCourtName || "").trim();

    // If CNR is not directly supplied, resolve or synthesize 16-character eCourts CNR from Case Details
    if (!cnr && caseNumber) {
      cnr = generateCnrFromCaseDetails({
        caseNumber,
        caseType,
        filingYear,
        courtName,
        state,
      });
    }

    // Check if case with this CNR or Case Number already exists under THIS law firm
    const existingCase = await prisma.case.findFirst({
      where: {
        firmId: effectiveFirmId,
        OR: [
          { cnr },
          ...(caseNumber ? [{ caseNumber }] : []),
        ],
      },
      include: { lawyer: true, client: true, firm: true },
    });

    if (existingCase) {
      return NextResponse.json(
        {
          error: `Case with CNR ${cnr} / Case Number ${caseNumber || cnr} is already registered under your chamber (${existingCase.firm?.name || "current firm"}).`,
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
          console.warn(`[eCourts] CNR ${cnr} not found in live eCourts database. Falling back to test mock.`);
          rawCaseData = getMockECourtsCase(cnr, {
            caseNumber: caseNumber || undefined,
            courtName: courtName || undefined,
            caseType: caseType || undefined,
          });
        } else {
          console.warn(`[eCourts] API error: ${err.message}. Using test mock dataset.`);
          rawCaseData = getMockECourtsCase(cnr, {
            caseNumber: caseNumber || undefined,
            courtName: courtName || undefined,
            caseType: caseType || undefined,
          });
        }
      }
    } else {
      console.log(`[eCourts] No ECOURTS_API_KEY configured. Generating standard test case mock.`);
      rawCaseData = getMockECourtsCase(cnr, {
        caseNumber: caseNumber || undefined,
        courtName: courtName || undefined,
        caseType: caseType || undefined,
      });
    }

    if (!rawCaseData) {
      rawCaseData = getMockECourtsCase(cnr, {
        caseNumber: caseNumber || undefined,
        courtName: courtName || undefined,
        caseType: caseType || undefined,
      });
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

      // Extract filing year from CNR or user input or registrationDate
      const filingYearMatch = cnr.match(/\d{4}$/);
      const resolvedFilingYear = filingYear || (filingYearMatch ? filingYearMatch[0] : null);

      const newCase = await tx.case.create({
        data: {
          cnr,
          lawyerId: lawyer.id,
          clientId: client.id,
          firmId: effectiveFirmId,
          courtName: courtName || normalizedData.courtName || "eCourt",
          caseNumber: caseNumber || normalizedData.caseNumber || "N/A",
          filingYear: resolvedFilingYear,
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

      // Save additional lawyer and client contacts if provided
      const contactsToCreate: Array<{
        caseId: string;
        type: string;
        name: string;
        phone: string;
        role: string | null;
      }> = [];

      if (Array.isArray(additionalLawyers)) {
        for (const l of additionalLawyers) {
          if (l.name && l.phone) {
            contactsToCreate.push({
              caseId: newCase.id,
              type: "LAWYER",
              name: l.name,
              phone: l.phone,
              role: l.role || null,
            });
          }
        }
      }

      if (Array.isArray(additionalClients)) {
        for (const c of additionalClients) {
          if (c.name && c.phone) {
            contactsToCreate.push({
              caseId: newCase.id,
              type: "CLIENT",
              name: c.name,
              phone: c.phone,
              role: c.role || null,
            });
          }
        }
      }

      if (contactsToCreate.length > 0) {
        await tx.caseContact.createMany({
          data: contactsToCreate,
        });
      }

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
