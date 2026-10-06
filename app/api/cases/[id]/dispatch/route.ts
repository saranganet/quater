import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FIRM_COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/firm-session";
import { sendWhatsAppMessage } from "@/lib/whatsapp/qr-client";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await context.params;
    const activeFirmId = req.cookies.get(FIRM_COOKIE_NAME)?.value || null;
    const activeRole = req.cookies.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();

    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates cannot dispatch WhatsApp notifications. Only Lead Advocates have dispatch authority." },
        { status: 403 }
      );
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        lawyer: true,
        client: true,
        firm: true,
        contacts: true,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (activeFirmId && caseRecord.firmId && caseRecord.firmId !== activeFirmId) {
      return NextResponse.json(
        { error: "Access denied. Cannot dispatch updates for another chamber's matter." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      caseEventId,
      clientMessage,
      lawyerMessage,
      sendToClient = true,
      sendToLawyer = true,
      sendToContacts = true,
      customRecipients,
    } = body;

    const dispatchResults: Array<{
      recipientType: string;
      recipientName: string;
      phone: string;
      success: boolean;
      error?: string;
    }> = [];

    // 1. Client Dispatch
    if (sendToClient && clientMessage?.trim() && caseRecord.client?.whatsappNumber) {
      const clientText = clientMessage.trim();
      const sendRes = await sendWhatsAppMessage(caseRecord.client.whatsappNumber, clientText);
      dispatchResults.push({
        recipientType: "CLIENT",
        recipientName: caseRecord.client.name,
        phone: caseRecord.client.whatsappNumber,
        success: sendRes.success,
        error: sendRes.error,
      });

      // Record in notifications
      if (caseEventId) {
        await prisma.notification.create({
          data: {
            caseEventId,
            recipientType: "CLIENT",
            recipientName: caseRecord.client.name,
            recipientPhone: caseRecord.client.whatsappNumber,
            messageBody: clientText,
            channel: "WHATSAPP_MANUAL",
            status: sendRes.success ? "SENT" : "FAILED",
            errorMessage: sendRes.error || null,
            sentAt: sendRes.success ? new Date() : null,
          },
        });
      }
    }

    // 2. Primary Lawyer Dispatch
    if (sendToLawyer && lawyerMessage?.trim() && caseRecord.lawyer?.phone) {
      const lawyerText = lawyerMessage.trim();
      const sendRes = await sendWhatsAppMessage(caseRecord.lawyer.phone, lawyerText);
      dispatchResults.push({
        recipientType: "LAWYER",
        recipientName: caseRecord.lawyer.name,
        phone: caseRecord.lawyer.phone,
        success: sendRes.success,
        error: sendRes.error,
      });

      if (caseEventId) {
        await prisma.notification.create({
          data: {
            caseEventId,
            recipientType: "LAWYER",
            recipientName: caseRecord.lawyer.name,
            recipientPhone: caseRecord.lawyer.phone,
            messageBody: lawyerText,
            channel: "WHATSAPP_MANUAL",
            status: sendRes.success ? "SENT" : "FAILED",
            errorMessage: sendRes.error || null,
            sentAt: sendRes.success ? new Date() : null,
          },
        });
      }
    }

    // 3. Additional Contacts (Co-Advocates & Co-Clients)
    if (sendToContacts && Array.isArray(caseRecord.contacts)) {
      for (const contact of caseRecord.contacts) {
        const msgToSend = contact.type === "LAWYER" ? lawyerMessage : clientMessage;
        if (msgToSend?.trim() && contact.phone) {
          const sendRes = await sendWhatsAppMessage(contact.phone, msgToSend.trim());
          dispatchResults.push({
            recipientType: contact.type,
            recipientName: contact.name,
            phone: contact.phone,
            success: sendRes.success,
            error: sendRes.error,
          });

          if (caseEventId) {
            await prisma.notification.create({
              data: {
                caseEventId,
                recipientType: contact.type,
                recipientName: contact.name,
                recipientPhone: contact.phone,
                messageBody: msgToSend.trim(),
                channel: "WHATSAPP_MANUAL",
                status: sendRes.success ? "SENT" : "FAILED",
                errorMessage: sendRes.error || null,
                sentAt: sendRes.success ? new Date() : null,
              },
            });
          }
        }
      }
    }

    // If a caseEventId was passed, update its status
    if (caseEventId) {
      const anySuccess = dispatchResults.some((r) => r.success);
      await prisma.caseEvent.update({
        where: { id: caseEventId },
        data: {
          notificationStatus: anySuccess ? "SENT" : "FAILED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      dispatchedCount: dispatchResults.filter((r) => r.success).length,
      results: dispatchResults,
    });
  } catch (error: any) {
    console.error("[POST /api/cases/[id]/dispatch] Error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch manual WhatsApp message", details: error.message },
      { status: 500 }
    );
  }
}
