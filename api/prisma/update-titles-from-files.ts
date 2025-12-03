// prisma/update-titles-from-files.ts
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Hàm viết hoa đúng kiểu title
function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(/[\s\-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  console.log("⏳ Đang đọc danh sách file mp3...");

  // Thư mục chứa nhạc
  const musicDir = path.resolve(__dirname, "../../web/public/music");

  if (!fs.existsSync(musicDir)) {
    throw new Error("Không tìm thấy thư mục nhạc: " + musicDir);
  }

  // Lấy danh sách file mp3
  const files = fs
    .readdirSync(musicDir)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  if (files.length === 0) {
    console.log("❌ Không có file mp3 nào trong thư mục.");
    return;
  }

  console.log(`🎵 Tìm thấy ${files.length} file nhạc.`);

  // Lấy danh sách tracks
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`📀 Có ${tracks.length} track trong DB.`);

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const file = files[i % files.length]; // xoay vòng 412 file cho 1000 track

    const baseName = path.basename(file, ".mp3");

    // Chuyển baseName thành Title Case
    const formattedTitle = toTitleCase(
      baseName.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim(),
    );

    const audioPath = `/music/${file}`;

    await prisma.track.update({
      where: { id: track.id },
      data: {
        title: formattedTitle,
        audioUrl: audioPath,
      },
    });

    if (i % 30 === 0) {
      console.log(`✔ ${i + 1}/${tracks.length} → ${formattedTitle}`);
    }
  }

  console.log("🎉 Đã cập nhật toàn bộ title + audioUrl khớp tên file!");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
