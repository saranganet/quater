import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FIRM_COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/firm-session";
import { sendWhatsAppMessage } from "@/lib/whatsapp/qr-client";
import { formatDateDMY } from "@/lib/whatsapp/date-formatter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;

    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: {
        lawyer: true,
        client: true,
        firm: true,
        contacts: true,
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

    if (activeFirmId && caseRecord.firmId && caseRecord.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. This case belongs to another law chamber." },
        { status: 403 }
      );
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();

    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot edit case assignments." },
        { status: 403 }
      );
    }

    const existingCase = await prisma.case.findUnique({ where: { id } });
    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    if (activeFirmId && existingCase.firmId && existingCase.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot modify cases belonging to another chamber." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { lawyerId, lawyerName, lawyerPhone, firmId, notifyWhatsApp, briefingNotes } = body;

    let targetLawyerId = lawyerId;

    // If new lawyer details were provided directly
    if (!targetLawyerId && lawyerName && lawyerPhone) {
      const cleanPhone = lawyerPhone.trim();
      const cleanName = lawyerName.trim();

      let lawyer = await prisma.lawyer.findFirst({
        where: { phone: cleanPhone },
      });

      if (!lawyer) {
        lawyer = await prisma.lawyer.create({
          data: {
            name: cleanName,
            phone: cleanPhone,
          },
        });
      } else if (lawyer.name !== cleanName) {
        lawyer = await prisma.lawyer.update({
          where: { id: lawyer.id },
          data: { name: cleanName },
        });
      }
      targetLawyerId = lawyer.id;
    }

    const dataToUpdate: any = {};
    if (targetLawyerId) {
      dataToUpdate.lawyerId = targetLawyerId;
    }
    if (firmId !== undefined) {
      dataToUpdate.firmId = firmId || null;
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: dataToUpdate,
      include: {
        lawyer: true,
        client: true,
        firm: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Handle WhatsApp notification to assigned advocate
    let whatsappNotification: any = null;
    if (targetLawyerId && notifyWhatsApp !== false) {
      const lawyer = updatedCase.lawyer;
      const latestSnapshot = updatedCase.snapshots[0];
      const normalized: any = latestSnapshot?.importantFields;
      const nextHearing = normalized?.nextHearingDate
        ? formatDateDMY(normalized.nextHearingDate)
        : "Pending / To be listed";
      const purpose =
        normalized?.latestHearing?.purposeOfListing || normalized?.stage || "Scheduled Hearing";
      const firmName = updatedCase.firm?.name || "Our Law Chamber";

      const assignmentMessage = `⚖️ *[COURT MATTER ASSIGNMENT]*
Dear *${lawyer.name}*,

You have been assigned to appear and represent in the following matter by *${firmName}*:

📋 *Case Number:* ${updatedCase.caseNumber || "N/A"}
🆔 *CNR:* ${updatedCase.cnr}
🏛️ *Court Establishment:* ${updatedCase.courtName || "eCourts India"}
📅 *Next Scheduled Hearing:* ${nextHearing}
⚖️ *Stage / Purpose of Listing:* ${purpose}
👤 *Client:* ${updatedCase.client.name} (${updatedCase.client.whatsappNumber})
${briefingNotes?.trim() ? `\n📝 *Briefing Notes from Chambers:*\n${briefingNotes.trim()}\n` : ""}
_Please review the case history, orders, and listing diary in Quater._
_Dispatched via Quater Legal Chamber Operations._`;

      const directUrl = `https://wa.me/${lawyer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        assignmentMessage
      )}`;

      let wasSent = false;
      let sendError = null;

      try {
        const sendResult = await sendWhatsAppMessage(lawyer.phone, assignmentMessage);
        wasSent = sendResult.success;
        if (!sendResult.success) {
          sendError = sendResult.error || "Gateway dispatch failed";
        }
      } catch (err: any) {
        sendError = err.message || "Failed to reach WhatsApp Gateway";
      }

      // Record in audit log
      try {
        const assignmentEvent = await prisma.caseEvent.create({
          data: {
            caseId: updatedCase.id,
            eventType: "ADVOCATE_ASSIGNED",
            description: `Matter assigned to ${lawyer.name} (${lawyer.phone})`,
            notificationStatus: wasSent ? "SENT" : "PENDING",
            notifications: {
              create: {
                recipientType: "LAWYER",
                recipientName: lawyer.name,
                recipientPhone: lawyer.phone,
                messageBody: assignmentMessage,
                status: wasSent ? "SENT" : "FAILED",
                errorMessage: sendError,
                sentAt: wasSent ? new Date() : null,
              },
            },
          },
        });
      } catch (logErr) {
        console.warn("[PATCH /api/cases/[id]] Error logging assignment event:", logErr);
      }

      whatsappNotification = {
        sent: wasSent,
        recipient: lawyer.name,
        phone: lawyer.phone,
        error: sendError,
        messageBody: assignmentMessage,
        directUrl,
      };
    }

    return NextResponse.json({
      success: true,
      case: updatedCase,
      whatsappNotification,
    });
  } catch (error: any) {
    console.error("[PATCH /api/cases/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update case assignment", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();

    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot delete cases." },
        { status: 403 }
      );
    }

    const existingCase = await prisma.case.findUnique({ where: { id } });
    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (activeFirmId && existingCase.firmId && existingCase.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot delete cases belonging to another chamber." },
        { status: 403 }
      );
    }

    await prisma.case.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Case ${existingCase.caseNumber || existingCase.cnr} removed from chamber tracking.`,
    });
  } catch (error: any) {
    console.error("[DELETE /api/cases/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete case", details: error.message },
      { status: 500 }
    );
  }
}
