import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Finding tracks with genre='OTHER'...");

  // Đếm trước
  const before = await prisma.track.count({
    where: { genre: "OTHER" as any },
  });

  console.log(`👉 Found ${before} tracks to update`);

  // Với Mongo + Prisma: dùng raw command để updateMany
  const res = await prisma.$runCommandRaw({
    update: "Track",
    updates: [
      {
        q: { genre: "OTHER" },
        u: { $unset: { genre: " " } }, // hoặc: { $set: { genre: null } }
        multi: true,
      },
    ],
  });

  console.log("✅ Update result:", res);

  const after = await prisma.track.count({
    where: { genre: "OTHER" as any },
  });

  console.log(`🎉 Done. Remaining OTHER = ${after}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
