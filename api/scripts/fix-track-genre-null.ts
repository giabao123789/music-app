import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Fix tracks genre = null -> POP ...");

  const r = await prisma.$runCommandRaw({
    update: "Track",
    updates: [
      {
        q: { genre: null },
        u: { $set: { genre: "POP" } },
        multi: true,
      },
    ],
  });

  console.log("✅ Done:", r);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
