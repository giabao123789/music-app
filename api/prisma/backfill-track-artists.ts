// api/prisma/backfill-track-artists.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// tách "The Weeknd, JENNIE, Lily Rose Depp" -> ["The Weeknd","JENNIE","Lily Rose Depp"]
function splitArtistNames(full: string | null): string[] {
  if (!full) return [];
  const parts = full
    .split(/,|&/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // loại trùng
  return Array.from(new Set(parts));
}

async function main() {
  const tracks = await prisma.track.findMany({
    include: { artist: true },
  });

  console.log("🎵 Tổng số track:", tracks.length);

  for (const track of tracks) {
    const baseName = track.artist?.name ?? "Unknown Artist";
    const names = splitArtistNames(baseName);

    if (names.length === 0) continue;

    console.log(`Track: ${track.title} | artists =`, names.join(" | "));

    let primaryArtistId: string | null = null;

    for (let i = 0; i < names.length; i++) {
      const name = names[i];

      // tạo 3 artist riêng biệt nếu chưa có
      let artist = await prisma.artist.findFirst({
        where: { name },
      });

      if (!artist) {
        artist = await prisma.artist.create({
          data: {
            name,
            // có thể set avatar mặc định ở đây nếu bạn muốn
          },
        });
      }

      if (i === 0) {
        primaryArtistId = artist.id; // nghệ sĩ chính (The Weeknd)
      }

      // tạo bản ghi TrackArtist (nếu chưa có)
      await prisma.trackArtist.upsert({
        where: {
          trackId_artistId: {
            trackId: track.id,
            artistId: artist.id,
          },
        },
        update: {},
        create: {
          trackId: track.id,
          artistId: artist.id,
          isPrimary: i === 0,
        },
      });
    }

    // cập nhật track.artistId = nghệ sĩ chính
    if (primaryArtistId && track.artistId !== primaryArtistId) {
      await prisma.track.update({
        where: { id: track.id },
        data: { artistId: primaryArtistId },
      });
    }
  }

  console.log("✅ Đã backfill TrackArtist xong.");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
