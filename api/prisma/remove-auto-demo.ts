import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Đang xóa chữ (Auto Demo ##) khỏi title...");

  // Regex: tìm "(Auto Demo X)" hoặc "(Auto Demo XX)" hoặc "(Auto Demo XXX)"
  const regex = /\(Auto Demo\s*\d+\)/gi;

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

  console.log("🎉 Hoàn tất!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
