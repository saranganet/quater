import prisma from "../prisma";
import { whatsAppClient, maskPhoneNumber } from "../whatsapp/client";
import {
  buildCaseUpdateTemplatePayload,
  formatCaseUpdateTextMessage,
  CaseUpdateTemplateVariables,
} from "../whatsapp/templates";
import { sendWhatsAppMessage } from "../whatsapp/qr-client";
import { formatDateDMY, formatDatesInText } from "../whatsapp/date-formatter";

export interface RecipientInfo {
  type: "LAWYER" | "CLIENT";
  name: string;
  phone: string;
}

export interface FirmInfo {
  name: string;
  leadAdvocate?: string | null;
  clientMessageIntro?: string | null;
  clientCustomNote?: string | null;
  contactPhone?: string | null;
}

export interface CaseNotificationPayload {
  caseEventId: string;
  caseId: string;
  cnr: string;
  caseNumber: string;
  courtName?: string;
  changeDescription: string;
  eventKey?: string;
  nextHearingDate: string | null;
  firm?: FirmInfo | null;
  recipients: RecipientInfo[];
}

export interface NotificationResult {
  recipientType: string;
  recipientPhone: string;
  status: "SENT" | "MOCKED" | "FAILED" | "DUPLICATE_SKIPPED";
  providerMessageId?: string;
  errorMessage?: string;
}

export interface NotificationService {
  sendCaseUpdateNotification(
    payload: CaseNotificationPayload
  ): Promise<NotificationResult[]>;
}

export function formatLawyerCaseUpdateMessage(payload: {
  caseNumber: string;
  cnr: string;
  courtName?: string;
  changeDescription: string;
  nextHearingDate: string | null;
  clientName: string;
}): string {
  const formattedHearingDate = formatDateDMY(payload.nextHearingDate);
  const formattedDescription = formatDatesInText(payload.changeDescription);
  const nextHearingText = formattedHearingDate
    ? `📅 *Next Hearing:* ${formattedHearingDate}`
    : "📅 *Next Hearing:* To be scheduled";

  return `⚖️ *[QUATER CASE ALERT]*
Advocate, there is an official update for your tracked case:

📋 *Case:* ${payload.caseNumber || "N/A"}
🏛️ *Court:* ${payload.courtName || "eCourts India"}
🆔 *CNR:* ${payload.cnr}

🔔 *Update:* ${formattedDescription}
${nextHearingText}

✅ _Client (${payload.clientName}) has also been notified automatically._
_Powered by Quater Legal Updates_`;
}

export function formatClientCaseUpdateMessage(payload: {
  caseNumber: string;
  cnr: string;
  courtName?: string;
  changeDescription: string;
  nextHearingDate: string | null;
  clientName: string;
  firm?: FirmInfo | null;
}): string {
  const firmName = payload.firm?.name || "Your Legal Counsel";
  const intro =
    payload.firm?.clientMessageIntro ||
    `Dear ${payload.clientName}, greetings from ${firmName}. Here is an official court update regarding your ongoing matter:`;
  const contactPhone = payload.firm?.contactPhone || "+91 98506 70809";
  const contact = `\n📞 *Contact:* ${contactPhone}`;
  const formattedHearingDate = formatDateDMY(payload.nextHearingDate);
  const nextHearingText = formattedHearingDate
    ? `📅 *Next Hearing Date:* ${formattedHearingDate}`
    : "📅 *Next Hearing Date:* To be scheduled";

  return `⚖️ *COURT CASE UPDATE*
*${firmName}*

${intro}

📋 *Case:* ${payload.caseNumber || "N/A"}
🏛️ *Court:* ${payload.courtName || "eCourts India"}
🆔 *CNR:* ${payload.cnr}
${nextHearingText}
${contact}

_Sent on behalf of ${firmName} via Quater Notification System._`;
}

export class WhatsAppNotificationService implements NotificationService {
  private mode: "qr" | "meta" | "mock";

  constructor() {
    const provider = (process.env.WHATSAPP_PROVIDER || "").toLowerCase();
    const isEnabled = process.env.WHATSAPP_ENABLED === "true";

    if (provider === "meta") {
      this.mode = isEnabled ? "meta" : "mock";
    } else if (provider === "mock") {
      this.mode = "mock";
    } else {
      // Default to "qr" mode for local development/MVP
      this.mode = isEnabled ? "qr" : "qr";
    }
  }

  async sendCaseUpdateNotification(
    payload: CaseNotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const clientRecipient = payload.recipients.find((r) => r.type === "CLIENT");
    const clientName = clientRecipient?.name || "Client";

    for (const recipient of payload.recipients) {
      const maskedPhone = maskPhoneNumber(recipient.phone);

      // Deterministic idempotency key: caseId:phone:eventKeyOrDescription
      const idempotencyKey = `${payload.caseId}:${recipient.phone}:${payload.eventKey || payload.changeDescription}`;

      // 🛡️ DEDUPLICATION GUARD: Check if this exact update was ALREADY sent to this recipient
      const alreadyDelivered = await prisma.notification.findFirst({
        where: {
          idempotencyKey,
          status: { in: ["SENT", "MOCKED"] },
        },
      });

      if (alreadyDelivered) {
        console.log(
          `[WhatsApp Deduplication] 🛡️ SUPPRESSED duplicate message for ${recipient.type} (${recipient.name} - ${maskedPhone}). Already sent on ${alreadyDelivered.sentAt?.toISOString() || "previous run"}.`
        );

        // Record the deduplication suppression in database audit log
        await prisma.notification.create({
          data: {
            caseEventId: payload.caseEventId,
            recipientType: recipient.type,
            recipientName: recipient.name,
            recipientPhone: recipient.phone,
            messageBody: alreadyDelivered.messageBody,
            channel: "WHATSAPP_DEDUP",
            status: "DUPLICATE_SKIPPED",
            idempotencyKey,
            providerMessageId: alreadyDelivered.providerMessageId,
            errorMessage: `Suppressed: update already delivered on ${alreadyDelivered.sentAt ? new Date(alreadyDelivered.sentAt).toLocaleString() : "earlier check"} (Msg ID: ${alreadyDelivered.providerMessageId})`,
            sentAt: alreadyDelivered.sentAt,
          },
        });

        results.push({
          recipientType: recipient.type,
          recipientPhone: recipient.phone,
          status: "DUPLICATE_SKIPPED",
          providerMessageId: alreadyDelivered.providerMessageId || undefined,
        });
        continue;
      }

      // Generate customized text message based on whether recipient is Lawyer or Client
      const personalizedMessage =
        recipient.type === "LAWYER"
          ? formatLawyerCaseUpdateMessage({
              caseNumber: payload.caseNumber,
              cnr: payload.cnr,
              courtName: payload.courtName,
              changeDescription: payload.changeDescription,
              nextHearingDate: payload.nextHearingDate,
              clientName,
            })
          : formatClientCaseUpdateMessage({
              caseNumber: payload.caseNumber,
              cnr: payload.cnr,
              courtName: payload.courtName,
              changeDescription: payload.changeDescription,
              nextHearingDate: payload.nextHearingDate,
              clientName: recipient.name,
              firm: payload.firm,
            });

      // 1. QR Gateway Mode (Local Baileys connection)
      if (this.mode === "qr") {
        console.log(
          `[WhatsApp QR Service] Dispatching update to ${recipient.type} (${recipient.name} - ${maskedPhone})`
        );

        const qrResult = await sendWhatsAppMessage(recipient.phone, personalizedMessage);

        if (qrResult.success) {
          const providerMessageId = qrResult.messageId || `qr_wa_${Date.now()}`;
          await prisma.notification.create({
            data: {
              caseEventId: payload.caseEventId,
              recipientType: recipient.type,
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              messageBody: personalizedMessage,
              channel: "WHATSAPP_QR",
              status: "SENT",
              idempotencyKey,
              providerMessageId,
              sentAt: new Date(),
            },
          });

          results.push({
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            status: "SENT",
            providerMessageId,
          });
        } else {
          console.warn(
            `[WhatsApp QR Service] Gateway failed for ${recipient.type} (${maskedPhone}):`,
            qrResult.error
          );

          await prisma.notification.create({
            data: {
              caseEventId: payload.caseEventId,
              recipientType: recipient.type,
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              messageBody: personalizedMessage,
              channel: "WHATSAPP_QR",
              status: "FAILED",
              idempotencyKey,
              errorMessage: qrResult.error,
            },
          });

          results.push({
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            status: "FAILED",
            errorMessage: qrResult.error,
          });
        }
        continue;
      }

      // 2. Mock Mode (WhatsApp disabled or simulation without gateway)
      if (this.mode === "mock") {
        console.log(
          `[WhatsApp Mock] Notification to ${recipient.type} (${recipient.name} - ${maskedPhone}):\n${personalizedMessage}`
        );

        try {
          const providerMessageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const notificationRecord = await prisma.notification.create({
            data: {
              caseEventId: payload.caseEventId,
              recipientType: recipient.type,
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              messageBody: personalizedMessage,
              channel: "WHATSAPP_MOCK",
              status: "MOCKED",
              idempotencyKey,
              providerMessageId,
              sentAt: new Date(),
            },
          });

          results.push({
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            status: "MOCKED",
            providerMessageId: notificationRecord.providerMessageId || undefined,
          });
        } catch (dbErr: any) {
          console.error(`[WhatsApp Mock] DB error: ${dbErr?.message}`);
          results.push({
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            status: "FAILED",
            errorMessage: dbErr?.message,
          });
        }
        continue;
      }

      // 3. Meta Cloud API Mode (Optional production path)
      if (this.mode === "meta") {
        const templateVariables: CaseUpdateTemplateVariables = {
          caseNumber: payload.caseNumber,
          cnr: payload.cnr,
          changeDescription: formatDatesInText(payload.changeDescription),
          nextHearingDate: formatDateDMY(payload.nextHearingDate, "Not scheduled"),
        };

        try {
          const templatePayload = buildCaseUpdateTemplatePayload(
            recipient.phone,
            templateVariables
          );

          const response = await whatsAppClient.sendMessage(templatePayload);
          const providerMessageId = response.messages?.[0]?.id || "wa_live_sent";

          await prisma.notification.create({
            data: {
              caseEventId: payload.caseEventId,
              recipientType: recipient.type,
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              messageBody: personalizedMessage,
              channel: "WHATSAPP_CLOUD",
              status: "SENT",
              idempotencyKey,
              providerMessageId,
              sentAt: new Date(),
            },
          });

          results.push({
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            status: "SENT",
            providerMessageId,
          });
        } catch (sendErr: any) {
          console.error(
            `[WhatsApp Meta] Failed sending to ${recipient.type} (${maskedPhone}):`,
            sendErr?.message
          );

          await prisma.notification.create({
            data: {
              caseEventId: payload.caseEventId,
              recipientType: recipient.type,
              recipientName: recipient.name,
              recipientPhone: recipient.phone,
              messageBody: personalizedMessage,
              channel: "WHATSAPP_CLOUD",
              status: "FAILED",
              idempotencyKey,
              errorMessage: sendErr?.message || "Unknown delivery failure",
            },
          });

          results.push({
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            status: "FAILED",
            errorMessage: sendErr?.message,
          });
        }
      }
    }

    return results;
  }
}

export const notificationService: NotificationService = new WhatsAppNotificationService();
