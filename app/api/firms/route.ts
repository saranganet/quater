import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FIRM_COOKIE_NAME, ROLE_COOKIE_NAME, MEMBER_ID_COOKIE_NAME } from "@/lib/firm-session";

export async function GET() {
  try {
    const firms = await prisma.firm.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: { cases: true, members: true },
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
    const {
      name,
      slug,
      leadAdvocate,
      contactPhone,
      clientMessageIntro,
      clientCustomNote,
      dispatchMode = "AUTOMATIC",
      initialMembers = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Chamber name is required." }, { status: 400 });
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
        dispatchMode: dispatchMode.toUpperCase() === "MANUAL" ? "MANUAL" : "AUTOMATIC",
      },
    });

    // Add Lead Advocate as member if provided
    let createdAdminMemberId: string | null = null;
    if (leadAdvocate?.trim()) {
      const adminMember = await prisma.firmMember.create({
        data: {
          firmId: firm.id,
          name: leadAdvocate.trim(),
          phone: contactPhone?.trim() || "+91 98506 70809",
          role: "ADMIN",
          title: "Lead Advocate & Admin",
        },
      });
      createdAdminMemberId = adminMember.id;
    }

    // Add additional members (junior advocates, associates)
    if (Array.isArray(initialMembers) && initialMembers.length > 0) {
      for (const m of initialMembers) {
        if (m.name && m.phone) {
          await prisma.firmMember.create({
            data: {
              firmId: firm.id,
              name: m.name.trim(),
              phone: m.phone.trim(),
              role: m.role?.toUpperCase() === "ADMIN" ? "ADMIN" : "JUNIOR",
              title: m.title?.trim() || (m.role?.toUpperCase() === "ADMIN" ? "Partner Advocate" : "Junior Advocate"),
            },
          });
        }
      }
    }

    const fullFirm = await prisma.firm.findUnique({
      where: { id: firm.id },
      include: {
        members: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: { cases: true, members: true },
        },
      },
    });

    const response = NextResponse.json(fullFirm, { status: 201 });

    // Set cookie for new firm session
    const cookieOptions = {
      path: "/",
      httpOnly: false,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30,
    };
    response.cookies.set(FIRM_COOKIE_NAME, firm.id, cookieOptions);
    response.cookies.set(ROLE_COOKIE_NAME, "ADMIN", cookieOptions);
    if (createdAdminMemberId) {
      response.cookies.set(MEMBER_ID_COOKIE_NAME, createdAdminMemberId, cookieOptions);
    }

    return response;
  } catch (error: any) {
    console.error("[POST /api/firms] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A chamber with this name or slug already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
