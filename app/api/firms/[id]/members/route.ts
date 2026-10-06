import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ROLE_COOKIE_NAME, FIRM_COOKIE_NAME } from "@/lib/firm-session";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: firmId } = await context.params;

    const members = await prisma.firmMember.findMany({
      where: { firmId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { attendances: true },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch chamber members", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: firmId } = await context.params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase() || "ADMIN";

    // Junior advocates cannot add members
    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot add chamber advocates." },
        { status: 403 }
      );
    }

    if (activeFirmId && activeFirmId !== firmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot manage advocates for another chamber." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone, role = "JUNIOR", title } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "Advocate name and phone number are required." },
        { status: 400 }
      );
    }

    const member = await prisma.firmMember.create({
      data: {
        firmId,
        name: name.trim(),
        phone: phone.trim(),
        role: role.toUpperCase() === "ADMIN" ? "ADMIN" : "JUNIOR",
        title: title?.trim() || (role.toUpperCase() === "ADMIN" ? "Lead Advocate" : "Junior Advocate"),
      },
    });

    return NextResponse.json({
      success: true,
      member,
      message: `Added ${member.name} (${member.role}) to chamber roster.`,
    });
  } catch (error: any) {
    console.error("[POST /api/firms/[id]/members] Error:", error);
    return NextResponse.json(
      { error: "Failed to add chamber member", details: error.message },
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
        { error: "Access denied. Junior advocates have view-only access and cannot modify advocate permissions." },
        { status: 403 }
      );
    }

    if (activeFirmId && activeFirmId !== firmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot manage advocates for another chamber." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { memberId, name, phone, role, title } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required to update member." },
        { status: 400 }
      );
    }

    const updated = await prisma.firmMember.update({
      where: { id: memberId },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(role && { role: role.toUpperCase() === "ADMIN" ? "ADMIN" : "JUNIOR" }),
        ...(title !== undefined && { title: title?.trim() || null }),
      },
    });

    return NextResponse.json({
      success: true,
      member: updated,
      message: `Updated permissions for ${updated.name}.`,
    });
  } catch (error: any) {
    console.error("[PATCH /api/firms/[id]/members] Error:", error);
    return NextResponse.json(
      { error: "Failed to update member", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: firmId } = await context.params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase() || "ADMIN";

    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates cannot delete members." },
        { status: 403 }
      );
    }

    if (activeFirmId && activeFirmId !== firmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot delete members from another chamber." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const memberId = url.searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required." },
        { status: 400 }
      );
    }

    await prisma.firmMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({
      success: true,
      message: "Advocate removed from chamber roster.",
    });
  } catch (error: any) {
    console.error("[DELETE /api/firms/[id]/members] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete chamber member", details: error.message },
      { status: 500 }
    );
  }
}
