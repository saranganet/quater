import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { caseContactInputSchema } from "@/lib/validations/case";
import { FIRM_COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/firm-session";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await context.params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;

    const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (activeFirmId && caseRecord.firmId && caseRecord.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. This case belongs to another chamber." },
        { status: 403 }
      );
    }

    const contacts = await prisma.caseContact.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ contacts });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to load case contacts", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();
    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot add contacts." },
        { status: 403 }
      );
    }

    const { id: caseId } = await context.params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const body = await req.json();

    const parseResult = caseContactInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0]?.message || "Invalid contact details",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, phone, type, role } = parseResult.data;

    // Check if case exists
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (activeFirmId && caseRecord.firmId && caseRecord.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot modify contacts of another chamber's matter." },
        { status: 403 }
      );
    }

    // Check if contact with same phone already exists for this case
    const existing = await prisma.caseContact.findFirst({
      where: { caseId, phone },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A contact with this phone number is already added to this case." },
        { status: 409 }
      );
    }

    const contact = await prisma.caseContact.create({
      data: {
        caseId,
        type,
        name,
        phone,
        role: role || null,
      },
    });

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to add case contact", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();
    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot delete contacts." },
        { status: 403 }
      );
    }

    const { id: caseId } = await context.params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const url = new URL(req.url);
    const contactId = url.searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId query parameter is required." },
        { status: 400 }
      );
    }

    const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (activeFirmId && caseRecord.firmId && caseRecord.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot delete contacts of another chamber's matter." },
        { status: 403 }
      );
    }

    await prisma.caseContact.deleteMany({
      where: {
        id: contactId,
        caseId,
      },
    });

    return NextResponse.json({ success: true, message: "Contact removed successfully." });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete contact", details: error.message },
      { status: 500 }
    );
  }
}
