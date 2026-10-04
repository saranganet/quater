import prisma from "../prisma";
import { whatsAppClient, maskPhoneNumber } from "../whatsapp/client";
import {
  buildCaseUpdateTemplatePayload,
  formatCaseUpdateTextMessage,
  CaseUpdateTemplateVariables,
} from "../whatsapp/templates";

export interface RecipientInfo {
  type: "LAWYER" | "CLIENT";
  name: string;
  phone: string;
}

export interface CaseNotificationPayload {
  caseEventId: string;
  caseId: string;
  cnr: string;
  caseNumber: string;
  changeDescription: string;
  nextHearingDate: string | null;
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

export class WhatsAppNotificationService implements NotificationService {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.WHATSAPP_ENABLED === "true";
  }

  async sendCaseUpdateNotification(
    payload: CaseNotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const templateVariables: CaseUpdateTemplateVariables = {
      caseNumber: payload.caseNumber,
      cnr: payload.cnr,
      changeDescription: payload.changeDescription,
      nextHearingDate: payload.nextHearingDate || "Not scheduled",
    };

    for (const recipient of payload.recipients) {
      const maskedPhone = maskPhoneNumber(recipient.phone);

      if (!this.isEnabled) {
        // Mock Mode: Notification record is created, message logged without calling external API
        const textPreview = formatCaseUpdateTextMessage(templateVariables);
        console.log(
          `[WhatsApp Mock] Notification to ${recipient.type} (${recipient.name} - ${maskedPhone}):\n${textPreview}`
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
          console.error(`[WhatsApp Mock] Failed to save notification record: ${dbErr?.message}`);
          results.push({
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            status: "FAILED",
            errorMessage: dbErr?.message,
          });
        }
        continue;
      }

      // Live Mode: Dispatch via Meta WhatsApp Cloud API
      try {
        const templatePayload = buildCaseUpdateTemplatePayload(
          recipient.phone,
          templateVariables
        );

        console.log(
          `[WhatsApp Live] Dispatching template message to ${recipient.type} (${maskedPhone})`
        );

        const response = await whatsAppClient.sendMessage(templatePayload);
        const providerMessageId = response.messages?.[0]?.id || "wa_live_sent";

        await prisma.notification.create({
          data: {
            caseEventId: payload.caseEventId,
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            channel: "WHATSAPP",
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
          `[WhatsApp Live] Failed sending to ${recipient.type} (${maskedPhone}):`,
          sendErr?.message
        );

        await prisma.notification.create({
          data: {
            caseEventId: payload.caseEventId,
            recipientType: recipient.type,
            recipientPhone: recipient.phone,
            channel: "WHATSAPP",
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

    return results;
  }
}

export const notificationService: NotificationService = new WhatsAppNotificationService();
