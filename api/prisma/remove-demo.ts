import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Đang xoá chữ Demo khỏi tất cả title...");

  // Regex tìm mọi dạng chữ: Demo, demo, DEMO, (Demo), (Auto Demo 12), v.v.
  const regex = /\(?\s*auto\s*demo\s*\d*\s*\)?|\(?\s*demo\s*\d*\s*\)?/gi;

  const tracks = await prisma.track.findMany();

  for (const t of tracks) {
    const newTitle = t.title.replace(regex, "").trim();

    if (newTitle !== t.title) {
      console.log(`✔ ${t.title}  →  ${newTitle}`);

      await prisma.track.update({
        where: { id: t.id },
        data: { title: newTitle },
      });
    }
  }

  console.log("🎉 Đã xoá toàn bộ chữ Demo!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
