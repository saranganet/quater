import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  FIRM_COOKIE_NAME,
  ROLE_COOKIE_NAME,
  MEMBER_ID_COOKIE_NAME,
} from "@/lib/firm-session";

export async function GET(req: NextRequest) {
  try {
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase() === "JUNIOR" ? "JUNIOR" : "ADMIN";
    const activeMemberId = req.cookies.get(MEMBER_ID_COOKIE_NAME)?.value || null;

    let activeFirm = null;
    if (activeFirmId) {
      activeFirm = await prisma.firm.findUnique({
        where: { id: activeFirmId },
        include: {
          members: {
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { cases: true, members: true },
          },
        },
      });
    }

    const firms = await prisma.firm.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { cases: true, members: true },
        },
      },
    });

    return NextResponse.json({
      activeFirm,
      activeRole,
      activeMemberId,
      firms,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch firm session", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firmId, role = "ADMIN", memberId = null } = body;

    if (!firmId) {
      return NextResponse.json(
        { error: "Firm ID is required to log in." },
        { status: 400 }
      );
    }

    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { cases: true, members: true },
        },
      },
    });

    if (!firm) {
      return NextResponse.json(
        { error: "Selected law firm not found." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      firm,
      role: role.toUpperCase(),
      message: `Logged in as ${firm.name} (${role})`,
    });

    const cookieOptions = {
      path: "/",
      httpOnly: false,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    response.cookies.set(FIRM_COOKIE_NAME, firm.id, cookieOptions);
    response.cookies.set(ROLE_COOKIE_NAME, role.toUpperCase(), cookieOptions);
    if (memberId) {
      response.cookies.set(MEMBER_ID_COOKIE_NAME, memberId, cookieOptions);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to set active firm", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, memberId } = body;

    const response = NextResponse.json({
      success: true,
      role: role ? role.toUpperCase() : "ADMIN",
      message: `Active role switched to ${role}`,
    });

    const cookieOptions = {
      path: "/",
      httpOnly: false,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30,
    };

    if (role) {
      response.cookies.set(ROLE_COOKIE_NAME, role.toUpperCase(), cookieOptions);
    }
    if (memberId) {
      response.cookies.set(MEMBER_ID_COOKIE_NAME, memberId, cookieOptions);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to switch role", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out from firm session.",
    });

    response.cookies.delete(FIRM_COOKIE_NAME);
    response.cookies.delete(ROLE_COOKIE_NAME);
    response.cookies.delete(MEMBER_ID_COOKIE_NAME);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to log out of firm", details: error.message },
      { status: 500 }
    );
  }
}
