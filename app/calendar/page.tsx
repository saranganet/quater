import prisma from "@/lib/prisma";
import { FirmCalendar } from "@/components/FirmCalendar";
import { getActiveFirm } from "@/lib/firm-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Calendar & Daily Cause List | Quater",
  description:
    "View scheduled courtroom hearings, listing purposes, and assign arguing advocates across firm matters.",
};

export default async function CalendarPage() {
  const activeFirm = await getActiveFirm();

  if (!activeFirm) {
    redirect("/");
  }

  const [cases, lawyers] = await Promise.all([
    prisma.case.findMany({
      where: {
        firmId: activeFirm.id,
      },
      include: {
        lawyer: true,
        client: true,
        firm: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.lawyer.findMany({
      where: {
        cases: {
          some: {
            firmId: activeFirm.id,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <FirmCalendar
      initialCases={cases as any}
      firms={[activeFirm]}
      initialLawyers={lawyers}
    />
  );
}
