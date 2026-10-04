import { NextRequest, NextResponse } from "next/server";
import { monitorCase } from "@/lib/case-monitor/monitorCase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
