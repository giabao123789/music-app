// api/prisma/remove-duplicate-files.ts
import * as mm from "music-metadata";
import * as fs from "fs";
import * as path from "path";

const musicDir = path.join(__dirname, "../../web/public/music");

async function main() {
  console.log("📂 Scan thư mục:", musicDir);

  if (!fs.existsSync(musicDir)) {
    console.error("❌ Không tìm thấy thư mục web/public/music");
    return;
  }

  const files = fs
    .readdirSync(musicDir)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  console.log(`🎵 Tìm thấy ${files.length} file MP3\n`);

  const titleMap = new Map<string, string>(); // title -> file đầu tiên
  const toDelete: string[] = [];

  for (const filename of files) {
    const filepath = path.join(musicDir, filename);

    try {
      const metadata = await mm.parseFile(filepath);
      const title =
        metadata.common.title ||
        path.basename(filename, ".mp3").trim();

      const key = title.trim().toLowerCase();

      if (titleMap.has(key)) {
        // đã có 1 file cùng title → xoá file này
        console.log(`❌ Trùng title: "${title}" → xoá: ${filename}`);
        toDelete.push(filepath);
      } else {
        // lần đầu gặp → giữ lại
        console.log(`✔ Giữ file: "${filename}" (title: ${title})`);
        titleMap.set(key, filename);
      }
    } catch (e) {
      console.error("⚠ Không đọc được metadata của:", filename);
    }
  }

  console.log("\n🗑 Tổng số file cần xoá:", toDelete.length);

  for (const file of toDelete) {
    fs.unlinkSync(file);
    console.log("→ Đã xoá:", path.basename(file));
  }

  console.log("\n✨ Xong! Thư mục nhạc đã được lọc trùng theo Title.");
}

main();
