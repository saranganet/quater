import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default law firms for Quater...");

  const nalawade = await prisma.firm.upsert({
    where: { slug: "nalawade" },
    update: {},
    create: {
      name: "Nalawade & Associates",
      slug: "nalawade",
      leadAdvocate: "Adv. Nalawade",
      contactPhone: "+91 98200 11223",
      clientMessageIntro: "Greetings from Nalawade & Associates. We have an official court status update regarding your matter:",
      clientCustomNote: "Our litigation team is preparing the necessary filings. Please feel free to reach out to our office for any clarifications.",
    },
  });

  const saranga = await prisma.firm.upsert({
    where: { slug: "saranga" },
    update: {},
    create: {
      name: "Saranga Law Chambers",
      slug: "saranga",
      leadAdvocate: "Adv. S. Saranga",
      contactPhone: "+91 98111 44556",
      clientMessageIntro: "Important update from Saranga Law Chambers regarding your pending court proceedings:",
      clientCustomNote: "We have noted this listing and our counsel will represent you at the hearing. For urgent queries, contact our front desk.",
    },
  });

  console.log(`Firms seeded: ${nalawade.name}, ${saranga.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
