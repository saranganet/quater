import { NextResponse } from "next/server";
import { getGatewayStatus } from "@/lib/whatsapp/qr-client";

export async function GET() {
  try {
    const status = await getGatewayStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "DISCONNECTED",
        qrCodeDataUrl: null,
        connectedPhone: null,
        lastError: error.message,
      },
      { status: 500 }
    );
  }
}
