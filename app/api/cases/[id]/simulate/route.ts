import { NextRequest, NextResponse } from "next/server";
import { simulateCaseUpdate } from "@/lib/case-monitor/monitorCase";
import { simulateUpdateSchema } from "@/lib/validations/case";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
