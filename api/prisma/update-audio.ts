// prisma/update-audio.ts
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Đang load danh sách file MP3...");

  // 👉 Đường dẫn tuyệt đối tới thư mục web/public/music
  const musicDir = path.resolve(__dirname, "../../web/public/music");

  if (!fs.existsSync(musicDir)) {
    throw new Error("Không tìm thấy thư mục: " + musicDir);
  }

  // Lấy tất cả file .mp3 trong thư mục
  const files = fs
    .readdirSync(musicDir)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  if (files.length === 0) {
    throw new Error("Thư mục music không có file .mp3 nào!");
  }

  console.log(`🎵 Đã tìm thấy ${files.length} file mp3.`);

  // Lấy toàn bộ track trong DB (có thể là vài trăm / vài nghìn track)
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "asc" }, // để gán theo thứ tự tạo
  });

  console.log(`📀 Đang gán mp3 cho ${tracks.length} tracks...`);

  if (tracks.length === 0) {
    console.log("Không có track nào trong DB.");
    return;
  }

  // 🔁 CÁCH 1: Gán tuần tự, lặp lại vòng tròn (412 file cho 1000 tracks vẫn được)
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const file = files[i % files.length]; // xoay vòng 412 file

    // audioUrl phải là PATH TƯƠNG ĐỐI để web ghép thành http://localhost:3000 + path
    const audioPath = `/music/${file}`;

    await prisma.track.update({
      where: { id: track.id },
      data: { audioUrl: audioPath },
    });

    if (i % 50 === 0) {
      console.log(
        `✔ ${i + 1}/${tracks.length} - ${track.title}  →  ${audioPath}`,
      );
    }
  }

  // 🔁 CÁCH 2 (nếu thích random): thay vòng for trên bằng đoạn sau:
  // for (const track of tracks) {
  //   const file = files[Math.floor(Math.random() * files.length)];
  //   const audioPath = `/music/${file}`;
  //   await prisma.track.update({
  //     where: { id: track.id },
  //     data: { audioUrl: audioPath },
  //   });
  // }

  console.log("🎉 Đã gán xong audioUrl cho toàn bộ tracks!");
}

main()
  .catch((err) => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
