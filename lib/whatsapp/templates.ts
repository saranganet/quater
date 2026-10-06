import { WhatsAppTemplateMessagePayload } from "./types";
import { formatDateDMY, formatDatesInText } from "./date-formatter";

export interface CaseUpdateTemplateVariables {
  caseNumber: string;
  cnr: string;
  changeDescription: string;
  nextHearingDate: string;
  recipientName?: string;
}

export const DEFAULT_TEMPLATE_NAME =
  process.env.WHATSAPP_CASE_UPDATE_TEMPLATE || "case_update";

/**
 * Builds the Meta WhatsApp Cloud API template payload
 * Variables mapped:
 * {{1}} -> caseNumber
 * {{2}} -> cnr
 * {{3}} -> changeDescription
 * {{4}} -> nextHearingDate
 */
export function buildCaseUpdateTemplatePayload(
  toPhoneNumber: string,
  variables: CaseUpdateTemplateVariables,
  templateName: string = DEFAULT_TEMPLATE_NAME,
  languageCode: string = "en"
): WhatsAppTemplateMessagePayload {
  // Normalize phone number (E.164 without leading '+')
  const cleanPhone = toPhoneNumber.replace(/\D/g, "");
  const formattedHearingDate = formatDateDMY(variables.nextHearingDate, "Not scheduled");
  const formattedDescription = formatDatesInText(variables.changeDescription);

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: variables.caseNumber || "N/A" },
            { type: "text", text: variables.cnr },
            { type: "text", text: formattedDescription },
            { type: "text", text: formattedHearingDate },
          ],
        },
      ],
    },
  };
}

/**
 * Formats a plain text message for fallback or logging
 */
export function formatCaseUpdateTextMessage(variables: CaseUpdateTemplateVariables): string {
  const formattedHearingDate = formatDateDMY(variables.nextHearingDate);
  const formattedDescription = formatDatesInText(variables.changeDescription);
  const nextHearingText = formattedHearingDate
    ? `Next hearing: ${formattedHearingDate}`
    : "Next hearing: To be notified";

  return `⚖️ Case Update

Case: ${variables.caseNumber || "N/A"}
CNR: ${variables.cnr}

${formattedDescription}

${nextHearingText}

Please check the case details or contact your advocate for further information.`;
}
