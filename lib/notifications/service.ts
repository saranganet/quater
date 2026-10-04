import prisma from "../prisma";
import { whatsAppClient, maskPhoneNumber } from "../whatsapp/client";
import {
  buildCaseUpdateTemplatePayload,
  formatCaseUpdateTextMessage,
  CaseUpdateTemplateVariables,
} from "../whatsapp/templates";
import { sendWhatsAppMessage } from "../whatsapp/qr-client";

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
  nextHearingDate: string | null;
  firm?: FirmInfo | null;
  recipients: RecipientInfo[];
}

export interface NotificationResult {
  recipientType: string;
  recipientPhone: string;
  status: "SENT" | "MOCKED" | "FAILED";
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
  const nextHearingText = payload.nextHearingDate
    ? `📅 *Next Hearing:* ${payload.nextHearingDate}`
    : "📅 *Next Hearing:* To be scheduled";

  return `⚖️ *[QUATER CASE ALERT]*
Advocate, there is an official update for your tracked case:

📋 *Case:* ${payload.caseNumber || "N/A"}
🏛️ *Court:* ${payload.courtName || "eCourts India"}
🆔 *CNR:* ${payload.cnr}

🔔 *Update:* ${payload.changeDescription}
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
    `Dear ${payload.clientName}, greetings from ${firmName}. Here is an official status update regarding your ongoing court matter:`;
  const note =
    payload.firm?.clientCustomNote ||
    `Our litigation team is actively attending to this matter. Please keep this update for your records.`;
  const contact = payload.firm?.contactPhone
    ? `\n📞 *Office Contact:* ${payload.firm.contactPhone}`
    : "";
  const nextHearingText = payload.nextHearingDate
    ? `📅 *Next Hearing Date:* ${payload.nextHearingDate}`
    : "📅 *Next Hearing Date:* To be scheduled";

  return `⚖️ *COURT CASE UPDATE*
*${firmName}*

${intro}

📋 *Case:* ${payload.caseNumber || "N/A"}
🏛️ *Court:* ${payload.courtName || "eCourts India"}
🆔 *CNR:* ${payload.cnr}

🔔 *Status:* ${payload.changeDescription}
${nextHearingText}

💬 *Note from Counsel:*
${note}${contact}

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
          `[WhatsApp QR Service] Sending update to ${recipient.type} (${recipient.name} - ${maskedPhone})`
        );

        const qrResult = await sendWhatsAppMessage(recipient.phone, personalizedMessage);

        if (qrResult.success) {
          const providerMessageId = qrResult.messageId || `qr_wa_${Date.now()}`;
          await prisma.notification.create({
            data: {
              caseEventId: payload.caseEventId,
              recipientType: recipient.type,
              recipientPhone: recipient.phone,
              channel: "WHATSAPP_QR",
              status: "SENT",
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
              recipientPhone: recipient.phone,
              channel: "WHATSAPP_QR",
              status: "FAILED",
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
          const notificationRecord = await prisma.notification.create({
            data: {
              caseEventId: payload.caseEventId,
              recipientType: recipient.type,
              recipientPhone: recipient.phone,
              channel: "WHATSAPP",
              status: "MOCKED",
              providerMessageId: `mock_wa_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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
          changeDescription: payload.changeDescription,
          nextHearingDate: payload.nextHearingDate || "Not scheduled",
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
              recipientPhone: recipient.phone,
              channel: "WHATSAPP_CLOUD",
              status: "SENT",
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
              recipientPhone: recipient.phone,
              channel: "WHATSAPP_CLOUD",
              status: "FAILED",
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
