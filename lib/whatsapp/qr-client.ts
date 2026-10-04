export interface GatewayStatusResponse {
  status: "CONNECTING" | "SCAN_QR" | "CONNECTED" | "DISCONNECTED";
  qrCodeDataUrl: string | null;
  rawQr: string | null;
  connectedPhone: string | null;
  connectedName: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  to?: string;
}

const GATEWAY_BASE_URL = process.env.WHATSAPP_GATEWAY_URL || "http://127.0.0.1:3001";

export async function getGatewayStatus(): Promise<GatewayStatusResponse> {
  try {
    const res = await fetch(`${GATEWAY_BASE_URL}/status`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        status: "DISCONNECTED",
        qrCodeDataUrl: null,
        rawQr: null,
        connectedPhone: null,
        connectedName: null,
        lastError: `Gateway responded with status ${res.status}`,
        updatedAt: new Date().toISOString(),
      };
    }

    return await res.json();
  } catch (err: any) {
    return {
      status: "DISCONNECTED",
      qrCodeDataUrl: null,
      rawQr: null,
      connectedPhone: null,
      connectedName: null,
      lastError: "WhatsApp Gateway is not running. Please start the gateway service.",
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<SendMessageResponse> {
  try {
    const res = await fetch(`${GATEWAY_BASE_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, message }),
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${res.status}`,
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to connect to WhatsApp Gateway: ${err.message}`,
    };
  }
}

export async function logoutGateway(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${GATEWAY_BASE_URL}/logout`, {
      method: "POST",
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}
