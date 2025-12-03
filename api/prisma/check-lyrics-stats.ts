import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.track.count();
  const withLyrics = await prisma.track.count({
    where: { lyrics: { not: null } },
  });
  const withAudio = await prisma.track.count({
    where: { audioUrl: { not: null } },
  });
  const validDuration = await prisma.track.count({
    where: { duration: { gt: 0 } },
  });

  console.log("Tổng track:", total);
  console.log("Có lyrics:", withLyrics);
  console.log("Có audioUrl:", withAudio);
  console.log("Duration > 0:", validDuration);
}

main().finally(() => prisma.$disconnect());
