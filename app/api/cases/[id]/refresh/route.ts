import { NextRequest, NextResponse } from "next/server";
import { monitorCase } from "@/lib/case-monitor/monitorCase";
import prisma from "@/lib/prisma";
import { FIRM_COOKIE_NAME } from "@/lib/firm-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;

    const caseRecord = await prisma.case.findUnique({ where: { id } });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (activeFirmId && caseRecord.firmId && caseRecord.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot refresh another chamber's matter." },
        { status: 403 }
      );
    }

    console.log(`[API] Refreshing case ID: ${id}`);
    const result = await monitorCase(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[POST /api/cases/[id]/refresh] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to refresh case from eCourts",
      },
      { status: 500 }
    );
  }
}
