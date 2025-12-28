// api/scripts/fill-random-images.ts
import "dotenv/config";
import { MongoClient } from "mongodb";
import { readdirSync } from "fs";
import { join } from "path";

// Lấy URI Mongo từ DATABASE_URL (giống Prisma đang dùng)
const uri =
  process.env.DATABASE_URL ||
  "mongodb://127.0.0.1:27017/music-app"; // fallback nếu thiếu

// Đọc tất cả file ảnh trong folder con của uploads/images
function loadImageList(subDir: "artists" | "tracks"): string[] {
  const absDir = join(__dirname, "..", "uploads", "images", subDir);

  let files: string[] = [];
  try {
    files = readdirSync(absDir);
  } catch (e) {
    console.error("❌ Không đọc được thư mục:", absDir, e);
    return [];
  }

  const exts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

  return files
    .filter((f) =>
      exts.some((ext) => f.toLowerCase().endsWith(ext.toLowerCase())),
    )
    .map((f) => `/uploads/images/${subDir}/${f}`); // đường dẫn lưu trong DB
}

function pickRandom<T>(arr: T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

async function main() {
  // NẠP LIST ẢNH
  const artistAvatars = loadImageList("artists");
  const trackCovers = loadImageList("tracks");

  console.log("🎨 Artist avatars:", artistAvatars.length);
  console.log("🎵 Track covers:", trackCovers.length);

  if (artistAvatars.length === 0 && trackCovers.length === 0) {
    console.error("❌ Không có ảnh nào để random, dừng script.");
    return;
  }

  console.log("🔌 Kết nối MongoDB...");
  const client = new MongoClient(uri);
  await client.connect();

  const url = new URL(uri);
  const dbName = url.pathname.replace("/", "") || "music-app";
  const db = client.db(dbName);

  const artistCol = db.collection("Artist");
  const trackCol = db.collection("Track");

  // ====== ARTIST AVATAR – GÁN LẠI TẤT CẢ ======
  if (artistAvatars.length > 0) {
    console.log("🔄 Gán lại avatar cho toàn bộ Artist...");
    const artistCursor = artistCol.find({}); // không filter, lấy tất cả

    let artistCount = 0;
    for await (const artist of artistCursor) {
      const avatar = pickRandom(artistAvatars);
      await artistCol.updateOne(
        { _id: artist._id },
        { $set: { avatar } },
      );
      artistCount++;
      if (artistCount % 50 === 0) {
        console.log(`✅ Đã gán avatar cho ${artistCount} artist...`);
      }
    }
    console.log(`🎉 Tổng artist được gán avatar mới: ${artistCount}`);
  } else {
    console.log("⚠️ Không có ảnh artist nào, bỏ qua phần avatar.");
  }

  // ====== TRACK COVER – GÁN LẠI TẤT CẢ ======
  if (trackCovers.length > 0) {
    console.log("🔄 Gán lại cover cho toàn bộ Track...");
    const trackCursor = trackCol.find({}); // không filter, lấy tất cả

    let trackCount = 0;
    for await (const track of trackCursor) {
      const coverUrl = pickRandom(trackCovers);
      await trackCol.updateOne(
        { _id: track._id },
        { $set: { coverUrl } },
      );
      trackCount++;
      if (trackCount % 100 === 0) {
        console.log(`✅ Đã gán cover cho ${trackCount} track...`);
      }
    }
    console.log(`🎉 Tổng track được gán cover mới: ${trackCount}`);
  } else {
    console.log("⚠️ Không có ảnh track nào, bỏ qua phần cover.");
  }

  await client.close();
  console.log("✅ Hoàn tất fill-random-images.");
}

main().catch((err) => {
  console.error("❌ Lỗi khi chạy script fill-random-images:", err);
  process.exit(1);
});
