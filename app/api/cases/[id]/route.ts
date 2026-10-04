import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: {
        lawyer: true,
        client: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        events: {
          orderBy: { detectedAt: "desc" },
          include: {
            notifications: true,
          },
        },
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: caseRecord });
  } catch (error: any) {
    console.error("[GET /api/cases/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch case details", details: error.message },
      { status: 500 }
    );
  }
}
