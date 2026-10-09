import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveFirm } from "@/lib/firm-session";
import { generateDailyBoardDocx, DailyBoardMatter } from "@/lib/reports/daily-board-docx";
import { formatDateDMY } from "@/lib/whatsapp/date-formatter";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const firmIdParam = url.searchParams.get("firmId");

    const activeFirm = await getActiveFirm();
    const effectiveFirmId = firmIdParam || activeFirm?.id;

    if (!effectiveFirmId) {
      return NextResponse.json(
        { error: "No active law chamber found. Please log in to your chamber." },
        { status: 401 }
      );
    }

    const firm = await prisma.firm.findUnique({
      where: { id: effectiveFirmId },
      include: {
        members: true,
      },
    });

    if (!firm) {
      return NextResponse.json(
        { error: "Law firm not found." },
        { status: 404 }
      );
    }

    // Default to today in IST if date not provided
    let targetDate = dateParam;
    if (!targetDate) {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 3600000 * 5.5);
      targetDate = ist.toISOString().split("T")[0];
    }

    // Fetch all cases belonging to this firm
    const cases = await prisma.case.findMany({
      where: {
        firmId: firm.id,
      },
      include: {
        lawyer: true,
        client: true,
        contacts: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { courtName: "asc" },
    });

    // Filter matters scheduled on the target date
    const listedCases = cases.filter((c) => {
      const nextDate = (c.snapshots?.[0]?.importantFields as any)?.nextHearingDate;
      return nextDate === targetDate;
    });

    // Transform into DailyBoardMatter structures
    const matters: DailyBoardMatter[] = listedCases.map((c, idx) => {
      const imp: any = c.snapshots?.[0]?.importantFields || {};
      const petitioners = Array.isArray(imp.petitioners)
        ? imp.petitioners.join(", ")
        : imp.petitioner || c.client?.name || "Petitioner";
      const respondents = Array.isArray(imp.respondents)
        ? imp.respondents.join(", ")
        : imp.respondent || "Respondent";

      const juniorContact = c.contacts?.find((ct) => ct.type === "LAWYER");

      return {
        srNo: idx + 1,
        caseNumber: c.caseNumber || imp.caseNumber || "N/A",
        cnr: c.cnr,
        courtName: c.courtName || imp.courtName || "eCourt",
        judge: imp.judges?.[0] || imp.judge || null,
        petitioner: petitioners,
        respondent: respondents,
        stage: imp.stage || imp.latestHearing?.purposeOfListing || "Hearing",
        assignedAdvocate: c.lawyer?.name || firm.leadAdvocate || "Lead Counsel",
        advocatePhone: c.lawyer?.phone || firm.contactPhone || null,
        juniorAdvocate: juniorContact ? juniorContact.name : null,
        notes: null,
      };
    });

    // Generate Word document (.docx)
    const buffer = await generateDailyBoardDocx({
      firmName: firm.name,
      leadAdvocate: firm.leadAdvocate,
      contactPhone: firm.contactPhone,
      dateStr: targetDate,
      matters,
    });

    const formattedDate = formatDateDMY(targetDate).replace(/\//g, "-");
    const safeFirmSlug = (firm.slug || "chamber").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Daily_Board_${safeFirmSlug}_${formattedDate}.docx`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/calendar/daily-board] Error generating docx:", error);
    return NextResponse.json(
      { error: "Failed to generate Word Daily Board", details: error.message },
      { status: 500 }
    );
  }
}
