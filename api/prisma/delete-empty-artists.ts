// api/prisma/delete-empty-artists.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Đang tìm các nghệ sĩ không có bài hát...");

  const artists = await prisma.artist.findMany({
    include: {
      tracks: true,
      trackArtists: true,
      albums: true,
    },
  });

  const toDelete = artists.filter(
    (a) =>
      a.tracks.length === 0 &&
      a.trackArtists.length === 0 &&
      // tránh xoá nghệ sĩ gắn với user thật (role ARTIST)
      a.userId === null,
  );

  console.log("🗑 Số nghệ sĩ sẽ xoá:", toDelete.length);

  for (const artist of toDelete) {
    console.log(`→ Xoá artist: "${artist.name}" (${artist.id})`);

    // Xoá các album rỗng (nếu có) của artist này
    if (artist.albums.length > 0) {
      await prisma.album.deleteMany({
        where: { artistId: artist.id },
      });
      console.log(`   • Đã xoá ${artist.albums.length} album rỗng`);
    }

    // Cuối cùng xoá artist
    await prisma.artist.delete({
      where: { id: artist.id },
    });

    console.log("   ✔ Đã xoá nghệ sĩ");
  }

  console.log("✨ Hoàn tất xoá nghệ sĩ không có bài hát!");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
