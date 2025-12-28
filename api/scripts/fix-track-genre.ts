import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Fix tracks missing genre + remove OTHER...");

  // 1) Genre = OTHER -> đổi thành POP (hoặc bạn muốn đổi thành BALLAD tùy)
  const r1 = await prisma.$runCommandRaw({
    update: "Track",
    updates: [
      {
        q: { genre: "OTHER" },
        u: { $set: { genre: "POP" } },
        multi: true,
      },
    ],
  });

  // 2) Track bị thiếu field genre -> set mặc định POP
  const r2 = await prisma.$runCommandRaw({
    update: "Track",
    updates: [
      {
        q: { genre: { $exists: false } },
        u: { $set: { genre: "POP" } },
        multi: true,
      },
    ],
  });

  console.log("✅ Done.", { r1, r2 });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
