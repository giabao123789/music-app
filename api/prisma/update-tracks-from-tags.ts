// api/prisma/update-tracks-from-tags.ts
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as mm from "music-metadata";

const prisma = new PrismaClient();

// thư mục chứa file mp3: music-app/web/public/music
const musicDir = path.join(__dirname, "../../web/public/music");

// tách nghệ sĩ chính từ chuỗi nhiều người
function getPrimaryArtistName(artistStr: string | null | undefined): string {
  if (!artistStr) return "Unknown Artist";
  let s = artistStr;
  if (s.includes(",")) s = s.split(",")[0];
  if (s.includes("&")) s = s.split("&")[0];
  return s.trim() || "Unknown Artist";
}

async function main() {
  console.log("📂 Scan thư mục:", musicDir);

  if (!fs.existsSync(musicDir)) {
    console.error("❌ Không tìm thấy thư mục web/public/music");
    return;
  }

  const files = fs
    .readdirSync(musicDir)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  console.log(`🎵 Tìm thấy ${files.length} file mp3`);

  for (const filename of files) {
    const filepath = path.join(musicDir, filename);
    const audioUrl = `/music/${filename}`;

    console.log("\n==============================");
    console.log("🎧 Xử lý file:", filename);

    const metadata = await mm.parseFile(filepath);

    const title =
      metadata.common.title || path.basename(filename, ".mp3");
    const artistTag = metadata.common.artist || "Unknown Artist";
    const albumTitle = metadata.common.album || "Single";
    const durationSeconds = metadata.format.duration || 0;

    const primaryArtistName = getPrimaryArtistName(artistTag);

    console.log("   → Title :", title);
    console.log("   → Artist tag      :", artistTag);
    console.log("   → Primary artist  :", primaryArtistName);
    console.log("   → Album           :", albumTitle);

    // 1) Tìm hoặc tạo Artist chính theo primaryArtistName
    const artist = await prisma.artist.upsert({
      where: { name: primaryArtistName },
      update: {},
      create: {
        name: primaryArtistName,
        // bạn có thể set avatar default ở đây nếu muốn
      },
    });

    // 2) Nếu muốn có Album theo metadata thì có thể upsert (tuỳ schema bạn)
    // nếu Album của bạn có unique [title, artistId] thì dùng where đó,
    // còn không thì có thể bỏ phần album này luôn.
    let albumId: string | null = null;
    try {
      const album = await prisma.album.upsert({
        where: {
          // nếu schema không có @@unique([title, artistId]) thì sửa đoạn này
          title_artistId: {
            title: albumTitle,
            artistId: artist.id,
          },
        },
        update: {},
        create: {
          title: albumTitle,
          artistId: artist.id,
        },
      });
      albumId = album.id;
    } catch {
      // nếu schema khác, bạn bỏ phần album này cũng được
      albumId = null;
    }

    // 3) Tìm track theo audioUrl
    const existingTrack = await prisma.track.findFirst({
      where: { audioUrl },
    });

    const durationRounded = Math.round(durationSeconds);

    if (existingTrack) {
      // 🔁 Track đã tồn tại → update title + duration + artistId
      await prisma.track.update({
        where: { id: existingTrack.id },
        data: {
          title,
          duration: durationRounded || existingTrack.duration,
          artistId: artist.id,
          // nếu bạn có field artistCredit thì có thể lưu full chuỗi ở đây
          // artistCredit: artistTag,
          ...(albumId ? { albumId } : {}),
        },
      });

      console.log("   ✅ Đã cập nhật track:", existingTrack.id);
    } else {
      // ➕ Track chưa có trong DB → tạo mới
      await prisma.track.create({
        data: {
          title,
          duration: durationRounded,
          coverUrl:
            "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=800",
          audioUrl,
          artistId: artist.id,
          albumId,
          // artistCredit: artistTag, // nếu có field này
        },
      });

      console.log("   ✅ Đã tạo track mới từ file:", filename);
    }
  }

  console.log("\n🎉 Hoàn tất cập nhật tracks từ file nhạc!");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
