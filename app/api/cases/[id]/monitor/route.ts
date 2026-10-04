import { NextRequest, NextResponse } from "next/server";
import { monitorCase } from "@/lib/case-monitor/monitorCase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[API] Running manual update check for case ID: ${id}`);
    const result = await monitorCase(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[POST /api/cases/[id]/monitor] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check for updates",
      },
      { status: 500 }
    );
  }
}
