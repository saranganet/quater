import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const FIRM_COOKIE_NAME = "quater_active_firm_id";
export const ROLE_COOKIE_NAME = "quater_active_role";
export const MEMBER_ID_COOKIE_NAME = "quater_active_member_id";

export async function getActiveFirmId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(FIRM_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

export async function getActiveRole(): Promise<"ADMIN" | "JUNIOR"> {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get(ROLE_COOKIE_NAME)?.value?.toUpperCase();
    return role === "JUNIOR" ? "JUNIOR" : "ADMIN";
  } catch {
    return "ADMIN";
  }
}

export async function getActiveMemberId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(MEMBER_ID_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

export async function getActiveFirm() {
  const firmId = await getActiveFirmId();
  if (!firmId) return null;

  try {
    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { cases: true, members: true },
        },
      },
    });
    return firm;
  } catch (err) {
    console.error("[getActiveFirm] Error loading active firm:", err);
    return null;
  }
}
