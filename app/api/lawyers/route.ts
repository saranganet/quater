import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const lawyers = await prisma.lawyer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { cases: true },
        },
      },
    });

    return NextResponse.json(lawyers);
  } catch (error: any) {
    console.error("[GET /api/lawyers] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Advocate name is required." }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();

    // Check if lawyer with same phone already exists
    let lawyer = await prisma.lawyer.findFirst({
      where: { phone: trimmedPhone },
    });

    if (lawyer) {
      if (lawyer.name !== trimmedName) {
        lawyer = await prisma.lawyer.update({
          where: { id: lawyer.id },
          data: { name: trimmedName },
        });
      }
    } else {
      lawyer = await prisma.lawyer.create({
        data: {
          name: trimmedName,
          phone: trimmedPhone,
        },
      });
    }

    return NextResponse.json(lawyer, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/lawyers] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
