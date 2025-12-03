// api/prisma/update-tracks-from-tags.ts
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as mm from "music-metadata";

const prisma = new PrismaClient();

// Thư mục chứa file mp3: music-app/web/public/music
const musicDir = path.join(__dirname, "../../web/public/music");

// Tách list nghệ sĩ từ chuỗi "A, B & C"
function splitArtistNames(artistStr: string | null | undefined): string[] {
  if (!artistStr) return ["Unknown Artist"];

  const parts = artistStr
    .split(/,|&/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) return ["Unknown Artist"];

  // bỏ trùng
  return Array.from(new Set(parts));
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

  console.log(`🎵 Tìm thấy ${files.length} file mp3\n`);

  for (const filename of files) {
    const filepath = path.join(musicDir, filename);
    const audioUrl = `/music/${filename}`;

    console.log("====================================");
    console.log("🎧 Xử lý file:", filename);

    const metadata = await mm.parseFile(filepath);

    const title =
      metadata.common.title || path.basename(filename, ".mp3");
    const artistTag = metadata.common.artist || "Unknown Artist";
    const albumTitle = metadata.common.album || "Single";
    const durationSeconds = metadata.format.duration || 0;

    const artistNames = splitArtistNames(artistTag);

    console.log("   → Title        :", title);
    console.log("   → Artist tag   :", artistTag);
    console.log("   → Names split  :", artistNames.join(" | "));
    console.log("   → Album        :", albumTitle);

    // 1) Tạo / lấy từng Artist theo name (KHÔNG dùng unique, chỉ findFirst+create)
    const artistRecords: { id: string; name: string }[] = [];

    for (const name of artistNames) {
      let artist = await prisma.artist.findFirst({
        where: { name },
      });

      if (!artist) {
        artist = await prisma.artist.create({
          data: {
            name,
          },
        });
        console.log("      ➕ Tạo artist:", name);
      } else {
        console.log("      ✔ Đã có artist:", name);
      }

      artistRecords.push({ id: artist.id, name: artist.name });
    }

    const primaryArtistId = artistRecords[0].id;

    // 2) Tạo / lấy Album theo (title + primaryArtistId) bằng findFirst+create
    let albumId: string | null = null;
    try {
      let album = await prisma.album.findFirst({
        where: {
          title: albumTitle,
          artistId: primaryArtistId,
        },
      });

      if (!album) {
        album = await prisma.album.create({
          data: {
            title: albumTitle,
            artistId: primaryArtistId,
          },
        });
        console.log("      ➕ Tạo album:", albumTitle);
      } else {
        console.log("      ✔ Đã có album:", albumTitle);
      }

      albumId = album.id;
    } catch (e) {
      console.error("      ⚠ Lỗi xử lý album, bỏ qua album cho track này:", e);
      albumId = null;
    }

    // 3) Tạo / cập nhật Track theo audioUrl
    const existingTrack = await prisma.track.findFirst({
      where: { audioUrl },
    });

    const durationRounded = Math.round(durationSeconds);

    let track = existingTrack;

    if (existingTrack) {
      track = await prisma.track.update({
        where: { id: existingTrack.id },
        data: {
          title,
          duration: durationRounded || existingTrack.duration,
          artistId: primaryArtistId,
          ...(albumId ? { albumId } : {}),
        },
      });
      console.log("   ✅ Cập nhật track:", existingTrack.id);
    } else {
      track = await prisma.track.create({
        data: {
          title,
          duration: durationRounded,
          coverUrl:
            "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=800",
          audioUrl,
          artistId: primaryArtistId,
          albumId,
        },
      });
      console.log("   ✅ Tạo track mới:", track.id);
    }

    // 4) Đảm bảo quan hệ many–to–many trong TrackArtist
    for (let i = 0; i < artistRecords.length; i++) {
      const ar = artistRecords[i];

      await prisma.trackArtist.upsert({
        where: {
          trackId_artistId: {
            trackId: track.id,
            artistId: ar.id,
          },
        },
        update: {},
        create: {
          trackId: track.id,
          artistId: ar.id,
          isPrimary: i === 0,
        },
      });

      console.log(
        `      🎼 Gắn track ↔ artist: ${ar.name} (primary: ${
          i === 0 ? "yes" : "no"
        })`,
      );
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
