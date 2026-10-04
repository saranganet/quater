import {
  WhatsAppTemplateMessagePayload,
  WhatsAppTextMessagePayload,
  WhatsAppSendMessageResponse,
} from "./types";

export class WhatsAppClientError extends Error {
  code?: number;
  details?: unknown;

  constructor(message: string, code?: number, details?: unknown) {
    super(message);
    this.name = "WhatsAppClientError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Masks phone numbers for secure logging (e.g. 919876543210 -> 9198****3210)
 */
export function maskPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 6) return "***";
  return clean.slice(0, 4) + "****" + clean.slice(-4);
}

export class WhatsAppClient {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string;

  constructor(config?: {
    accessToken?: string;
    phoneNumberId?: string;
    apiVersion?: string;
  }) {
    this.accessToken = (config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    this.phoneNumberId = (config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
    this.apiVersion = config?.apiVersion || "v21.0";
  }

  isConfigured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  /**
   * Sends a message payload to Meta WhatsApp Cloud API
   */
  async sendMessage(
    payload: WhatsAppTemplateMessagePayload | WhatsAppTextMessagePayload
  ): Promise<WhatsAppSendMessageResponse> {
    if (!this.isConfigured()) {
      throw new WhatsAppClientError(
        "WhatsApp Cloud API credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are missing.",
        401
      );
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as WhatsAppSendMessageResponse;

      if (!response.ok || data.error) {
        throw new WhatsAppClientError(
          data.error?.message || `WhatsApp API error: ${response.statusText}`,
          data.error?.code || response.status,
          data.error
        );
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof WhatsAppClientError) throw err;
      throw new WhatsAppClientError(
        `Failed to reach Meta WhatsApp API: ${(err as Error)?.message || "Network error"}`
      );
    }
  }
}

export const whatsAppClient = new WhatsAppClient();
