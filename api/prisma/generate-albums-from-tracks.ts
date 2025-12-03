// api/prisma/generate-albums-from-tracks.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function generateAlbumsForAllArtists() {
  const artists = await prisma.artist.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${artists.length} artists`);

  const sizes = [7, 8]; // kích thước nhóm 7, 8, 7, 8,...

  for (const artist of artists) {
    console.log(`\n=== Artist: ${artist.name} (${artist.id}) ===`);

    // lấy các track chưa có album
    const tracks = await prisma.track.findMany({
      where: {
        artistId: artist.id,
        albumId: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    });

    if (tracks.length === 0) {
      console.log("No tracks without album, skip.");
      continue;
    }

    console.log(`Tracks without album: ${tracks.length}`);

    const shuffled = shuffle(tracks);
    let index = 0;
    let albumIndex = 0;

    while (index < shuffled.length) {
      const size = sizes[albumIndex % sizes.length];
      const group = shuffled.slice(index, index + size);
      if (group.length === 0) break;

      albumIndex++;

      const albumTitle = `Tuyển tập #${albumIndex} của ${artist.name}`;

      const album = await prisma.album.create({
        data: {
          title: albumTitle,
          artistId: artist.id,
          releaseAt: new Date(),
          // coverUrl bạn có thể để null, sau này sửa trong Prisma Studio
        },
      });

      console.log(
        `Created album "${albumTitle}" with ${group.length} tracks (id=${album.id})`
      );

      const trackIds = group.map((t) => t.id);

      await prisma.track.updateMany({
        where: { id: { in: trackIds } },
        data: { albumId: album.id },
      });

      index += group.length;
    }
  }
}

generateAlbumsForAllArtists()
  .then(() => {
    console.log("\nDone.");
  })
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
