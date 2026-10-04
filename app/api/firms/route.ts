import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const firms = await prisma.firm.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { cases: true },
        },
      },
    });

    return NextResponse.json(firms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, leadAdvocate, contactPhone, clientMessageIntro, clientCustomNote } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Firm name is required." }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const firm = await prisma.firm.create({
      data: {
        name: name.trim(),
        slug: cleanSlug,
        leadAdvocate: leadAdvocate?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        clientMessageIntro: clientMessageIntro?.trim() || null,
        clientCustomNote: clientCustomNote?.trim() || null,
      },
    });

    return NextResponse.json(firm, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A firm with this name or identifier already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
