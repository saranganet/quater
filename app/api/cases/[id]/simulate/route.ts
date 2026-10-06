import { NextRequest, NextResponse } from "next/server";
import { simulateCaseUpdate } from "@/lib/case-monitor/monitorCase";
import { simulateUpdateSchema } from "@/lib/validations/case";
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
        { error: "Access denied. Cannot simulate updates on another chamber's matter." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = simulateUpdateSchema.parse(body);

    console.log(`[API] Simulating case update for case ID: ${id}`, validated);
    const result = await simulateCaseUpdate(id, validated);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[POST /api/cases/[id]/simulate] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to simulate case update",
      },
      { status: 500 }
    );
  }
}
