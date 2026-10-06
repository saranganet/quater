import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FIRM_COOKIE_NAME, ROLE_COOKIE_NAME, MEMBER_ID_COOKIE_NAME } from "@/lib/firm-session";

function getTodayIST(): string {
  // Format YYYY-MM-DD in Asia/Kolkata timezone
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const dd = String(ist.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  try {
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const url = new URL(req.url);
    const dateQuery = url.searchParams.get("date") || getTodayIST();
    const queryFirmId = url.searchParams.get("firmId") || activeFirmId;

    if (!queryFirmId) {
      return NextResponse.json(
        { error: "No active chamber selected. Please log into a chamber." },
        { status: 400 }
      );
    }

    // Fetch chamber members
    const members = await prisma.firmMember.findMany({
      where: { firmId: queryFirmId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    // Fetch existing attendance records for the given date
    const records = await prisma.attendanceRecord.findMany({
      where: {
        firmId: queryFirmId,
        date: dateQuery,
      },
      include: {
        member: true,
      },
    });

    const recordMap = new Map<string, typeof records[0]>();
    records.forEach((r) => recordMap.set(r.memberId, r));

    // Combine members with their attendance status
    const attendanceSheet = members.map((member) => {
      const existing = recordMap.get(member.id);
      return {
        memberId: member.id,
        name: member.name,
        phone: member.phone,
        role: member.role,
        title: member.title || (member.role === "ADMIN" ? "Lead Advocate" : "Junior Advocate"),
        date: dateQuery,
        recordId: existing ? existing.id : null,
        status: existing ? existing.status : "UNMARKED", // "PRESENT", "IN_COURT", "ON_LEAVE", "ABSENT", or "UNMARKED"
        notes: existing?.notes || "",
        updatedAt: existing?.updatedAt || null,
      };
    });

    const stats = {
      total: members.length,
      present: attendanceSheet.filter((m) => m.status === "PRESENT").length,
      inCourt: attendanceSheet.filter((m) => m.status === "IN_COURT").length,
      onLeave: attendanceSheet.filter((m) => m.status === "ON_LEAVE").length,
      absent: attendanceSheet.filter((m) => m.status === "ABSENT").length,
      unmarked: attendanceSheet.filter((m) => m.status === "UNMARKED").length,
    };

    return NextResponse.json({
      date: dateQuery,
      firmId: queryFirmId,
      stats,
      members: attendanceSheet,
    });
  } catch (error: any) {
    console.error("[GET /api/attendance] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase() || "ADMIN";
    const activeMemberId = req.cookies.get(MEMBER_ID_COOKIE_NAME)?.value || null;

    if (!activeFirmId) {
      return NextResponse.json(
        { error: "No active chamber selected." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { date, memberId, status, notes } = body;

    const targetDate = date || getTodayIST();

    if (!memberId || !status) {
      return NextResponse.json(
        { error: "memberId and status are required." },
        { status: 400 }
      );
    }

    // Role check:
    // If user is JUNIOR, they can only update their own attendance record
    if (activeRole === "JUNIOR" && activeMemberId && activeMemberId !== memberId) {
      return NextResponse.json(
        { error: "Junior advocates can only mark their own attendance. Contact Lead Advocate to update team attendance." },
        { status: 403 }
      );
    }

    // Verify member belongs to this firm
    const member = await prisma.firmMember.findFirst({
      where: {
        id: memberId,
        firmId: activeFirmId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found in active chamber." },
        { status: 404 }
      );
    }

    // Upsert record
    const attendance = await prisma.attendanceRecord.upsert({
      where: {
        firmId_memberId_date: {
          firmId: activeFirmId,
          memberId,
          date: targetDate,
        },
      },
      update: {
        status,
        notes: notes !== undefined ? notes : undefined,
      },
      create: {
        firmId: activeFirmId,
        memberId,
        date: targetDate,
        status,
        notes: notes || null,
      },
      include: {
        member: true,
      },
    });

    return NextResponse.json({
      success: true,
      attendance,
      message: `Attendance marked for ${member.name}: ${status}`,
    });
  } catch (error: any) {
    console.error("[POST /api/attendance] Error:", error);
    return NextResponse.json(
      { error: "Failed to save attendance record", details: error.message },
      { status: 500 }
    );
  }
}
