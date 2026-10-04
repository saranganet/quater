import { NextResponse } from "next/server";
import { logoutGateway } from "@/lib/whatsapp/qr-client";

export async function POST() {
  try {
    const result = await logoutGateway();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
