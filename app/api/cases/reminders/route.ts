import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveFirm, getActiveRole } from "@/lib/firm-session";
import { formatClientEveReminderMessage } from "@/lib/notifications/service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/qr-client";
import { formatDateDMY } from "@/lib/whatsapp/date-formatter";

// Helper to get tomorrow's date in Indian Standard Time (IST)
function getTomorrowDateIST(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tomorrowIst = new Date(utc + 3600000 * 5.5 + 86400000);
  return tomorrowIst.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

export async function GET(req: NextRequest) {
  try {
    const activeFirm = await getActiveFirm();
    if (!activeFirm) {
      return NextResponse.json(
        { error: "No active law chamber found." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date") || getTomorrowDateIST();

    // Fetch all cases belonging to this firm
    const cases = await prisma.case.findMany({
      where: { firmId: activeFirm.id },
      include: {
        lawyer: true,
        client: true,
        contacts: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { courtName: "asc" },
    });

    // Filter cases listed on targetDate
    const listedCases = cases.filter((c) => {
      const nextDate = (c.snapshots?.[0]?.importantFields as any)?.nextHearingDate;
      return nextDate === dateParam;
    });

    // Check existing reminder dispatches for idempotency
    const items = await Promise.all(
      listedCases.map(async (c) => {
        const imp: any = c.snapshots?.[0]?.importantFields || {};
        const stage = imp.stage || imp.latestHearing?.purposeOfListing || "Hearing / Listing";
        const assignedAdvocate = c.lawyer?.name || activeFirm.leadAdvocate || "Lead Counsel";

        const idempotencyKey = `HEARING_EVE_REMINDER:${c.id}:${dateParam}:${c.client.whatsappNumber}`;

        const existingNotification = await prisma.notification.findFirst({
          where: {
            idempotencyKey,
            status: { in: ["SENT", "MOCKED"] },
          },
          orderBy: { createdAt: "desc" },
        });

        const suggestedMessage = formatClientEveReminderMessage({
          caseNumber: c.caseNumber || imp.caseNumber || "N/A",
          cnr: c.cnr,
          courtName: c.courtName,
          stage,
          nextHearingDate: dateParam,
          clientName: c.client.name,
          assignedAdvocate,
          firm: activeFirm,
        });

        return {
          caseId: c.id,
          cnr: c.cnr,
          caseNumber: c.caseNumber || imp.caseNumber || "N/A",
          courtName: c.courtName,
          stage,
          nextHearingDate: dateParam,
          formattedHearingDate: formatDateDMY(dateParam),
          clientName: c.client.name,
          clientPhone: c.client.whatsappNumber,
          assignedAdvocate,
          alreadySent: Boolean(existingNotification),
          sentAt: existingNotification?.sentAt?.toISOString() || null,
          suggestedMessage,
        };
      })
    );

    const sentCount = items.filter((i) => i.alreadySent).length;
    const pendingCount = items.length - sentCount;

    return NextResponse.json({
      targetDate: dateParam,
      formattedDate: formatDateDMY(dateParam),
      totalListed: items.length,
      sentCount,
      pendingCount,
      matters: items,
    });
  } catch (error: any) {
    console.error("[GET /api/cases/reminders] Error fetching hearing reminders:", error);
    return NextResponse.json(
      { error: "Failed to load hearing reminders", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const activeFirm = await getActiveFirm();
    const activeRole = await getActiveRole();

    if (!activeFirm) {
      return NextResponse.json(
        { error: "No active law chamber found." },
        { status: 401 }
      );
    }

    if (activeRole === "JUNIOR") {
      return NextResponse.json(
        { error: "Access denied. Junior advocates have view-only access and cannot dispatch messages." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { caseId, bulk = false, date: inputDate, customMessage = null } = body;

    const targetDate = inputDate || getTomorrowDateIST();

    // Query relevant cases
    const whereClause: any = { firmId: activeFirm.id };
    if (caseId) {
      whereClause.id = caseId;
    }

    const cases = await prisma.case.findMany({
      where: whereClause,
      include: {
        lawyer: true,
        client: true,
        contacts: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const targetCases = cases.filter((c) => {
      if (caseId) return true; // Direct single-case target
      const nextDate = (c.snapshots?.[0]?.importantFields as any)?.nextHearingDate;
      return nextDate === targetDate;
    });

    if (targetCases.length === 0) {
      return NextResponse.json(
        { message: "No cases found scheduled for hearing on " + targetDate },
        { status: 200 }
      );
    }

    const results: Array<{
      caseId: string;
      caseNumber: string;
      clientName: string;
      phone: string;
      status: "SENT" | "MOCKED" | "DUPLICATE_SKIPPED" | "FAILED";
      error?: string;
    }> = [];

    const isWhatsAppEnabled = process.env.WHATSAPP_ENABLED === "true";

    for (const c of targetCases) {
      const imp: any = c.snapshots?.[0]?.importantFields || {};
      const stage = imp.stage || imp.latestHearing?.purposeOfListing || "Hearing / Listing";
      const assignedAdvocate = c.lawyer?.name || activeFirm.leadAdvocate || "Lead Counsel";

      const idempotencyKey = `HEARING_EVE_REMINDER:${c.id}:${targetDate}:${c.client.whatsappNumber}`;

      // Check if already sent
      const existing = await prisma.notification.findFirst({
        where: {
          idempotencyKey,
          status: { in: ["SENT", "MOCKED"] },
        },
      });

      if (existing && !customMessage) {
        results.push({
          caseId: c.id,
          caseNumber: c.caseNumber,
          clientName: c.client.name,
          phone: c.client.whatsappNumber,
          status: "DUPLICATE_SKIPPED",
        });
        continue;
      }

      const finalMessage =
        customMessage?.trim() ||
        formatClientEveReminderMessage({
          caseNumber: c.caseNumber || imp.caseNumber || "N/A",
          cnr: c.cnr,
          courtName: c.courtName,
          stage,
          nextHearingDate: targetDate,
          clientName: c.client.name,
          assignedAdvocate,
          firm: activeFirm,
        });

      // Create a CaseEvent record for the reminder
      const reminderEvent = await prisma.caseEvent.create({
        data: {
          caseId: c.id,
          eventType: "HEARING_EVE_REMINDER",
          eventKey: `REMINDER:${targetDate}`,
          description: `1-Day-Prior Hearing Reminder for listing on ${formatDateDMY(targetDate)}`,
          notificationStatus: "PENDING",
        },
      });

      // Dispatch via WhatsApp Gateway
      try {
        const qrResult = await sendWhatsAppMessage(c.client.whatsappNumber, finalMessage);

        if (qrResult.success) {
          const providerId = qrResult.messageId || `reminder_${Date.now()}`;
          await prisma.notification.create({
            data: {
              caseEventId: reminderEvent.id,
              recipientType: "CLIENT",
              recipientName: c.client.name,
              recipientPhone: c.client.whatsappNumber,
              messageBody: finalMessage,
              channel: "WHATSAPP_EVE_REMINDER",
              status: "SENT",
              idempotencyKey,
              providerMessageId: providerId,
              sentAt: new Date(),
            },
          });

          await prisma.caseEvent.update({
            where: { id: reminderEvent.id },
            data: { notificationStatus: "SENT" },
          });

          results.push({
            caseId: c.id,
            caseNumber: c.caseNumber,
            clientName: c.client.name,
            phone: c.client.whatsappNumber,
            status: "SENT",
          });
        } else {
          // If gateway offline, record as MOCKED or FAILED
          const status = !isWhatsAppEnabled ? "MOCKED" : "FAILED";
          await prisma.notification.create({
            data: {
              caseEventId: reminderEvent.id,
              recipientType: "CLIENT",
              recipientName: c.client.name,
              recipientPhone: c.client.whatsappNumber,
              messageBody: finalMessage,
              channel: "WHATSAPP_EVE_REMINDER",
              status,
              idempotencyKey,
              errorMessage: qrResult.error,
              sentAt: status === "MOCKED" ? new Date() : null,
            },
          });

          results.push({
            caseId: c.id,
            caseNumber: c.caseNumber,
            clientName: c.client.name,
            phone: c.client.whatsappNumber,
            status,
            error: qrResult.error,
          });
        }
      } catch (sendErr: any) {
        results.push({
          caseId: c.id,
          caseNumber: c.caseNumber,
          clientName: c.client.name,
          phone: c.client.whatsappNumber,
          status: "FAILED",
          error: sendErr?.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      targetDate,
      totalProcessed: results.length,
      dispatchedCount: results.filter((r) => r.status === "SENT" || r.status === "MOCKED").length,
      results,
    });
  } catch (error: any) {
    console.error("[POST /api/cases/reminders] Error dispatching hearing reminders:", error);
    return NextResponse.json(
      { error: "Failed to dispatch hearing reminders", details: error.message },
      { status: 500 }
    );
  }
}
