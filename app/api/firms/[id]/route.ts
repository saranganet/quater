import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ROLE_COOKIE_NAME, FIRM_COOKIE_NAME } from "@/lib/firm-session";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: firmId } = await context.params;

    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
      include: {
        members: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: { cases: true, members: true, attendances: true },
        },
      },
    });

    if (!firm) {
      return NextResponse.json({ error: "Chamber not found" }, { status: 404 });
    }

    return NextResponse.json(firm);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch chamber details", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: firmId } = await context.params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase() || "ADMIN";

    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot modify chamber settings." },
        { status: 403 }
      );
    }

    if (activeFirmId && activeFirmId !== firmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot modify settings of another chamber." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      leadAdvocate,
      contactPhone,
      clientMessageIntro,
      clientCustomNote,
      dispatchMode,
    } = body;

    const updated = await prisma.firm.update({
      where: { id: firmId },
      data: {
        ...(name && { name: name.trim() }),
        ...(leadAdvocate !== undefined && { leadAdvocate: leadAdvocate?.trim() || null }),
        ...(contactPhone !== undefined && { contactPhone: contactPhone?.trim() || null }),
        ...(clientMessageIntro !== undefined && { clientMessageIntro: clientMessageIntro?.trim() || null }),
        ...(clientCustomNote !== undefined && { clientCustomNote: clientCustomNote?.trim() || null }),
        ...(dispatchMode && {
          dispatchMode: dispatchMode.toUpperCase() === "MANUAL" ? "MANUAL" : "AUTOMATIC",
        }),
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json({
      success: true,
      firm: updated,
      message: "Chamber settings updated successfully.",
    });
  } catch (error: any) {
    console.error("[PATCH /api/firms/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update chamber settings", details: error.message },
      { status: 500 }
    );
  }
}
