// api/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ===== Users (demo + admin) =====
  const passHash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'demo@user.local' },
    update: { password: passHash, role: 'USER' },
    create: { email: 'demo@user.local', name: 'Demo User', password: passHash, role: 'USER' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@site.local' },
    update: { password: passHash, role: 'ADMIN' },
    create: { email: 'admin@site.local', name: 'Admin', password: passHash, role: 'ADMIN' },
  });

  const user = await prisma.user.findUnique({ where: { email: 'demo@user.local' } });

  // ===== Artist demo =====
  await prisma.artist.upsert({
    where: { id: 'demo-artist' },
    update: {},
    create: { id: 'demo-artist', name: 'Demo Artist' },
  });

  // ===== Tracks (dùng upsert để không bị trùng) =====
  const tracks = [
    {
      id: 't1',
      title: 'Inspiring Day',
      duration: 356,
      coverUrl: 'https://picsum.photos/seed/cover1/300/300',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      artistId: 'demo-artist',
    },
    {
      id: 't2',
      title: 'Late Night Lo-fi',
      duration: 312,
      coverUrl: 'https://picsum.photos/seed/cover2/300/300',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      artistId: 'demo-artist',
    },
  ];

  for (const t of tracks) {
    await prisma.track.upsert({
      where: { id: t.id },
      update: {
        title: t.title,
        duration: t.duration,
        coverUrl: t.coverUrl,
        audioUrl: t.audioUrl,
        artistId: t.artistId,
      },
      create: t,
    });
  }

  // ===== Playlist mẫu cho user demo (nếu chưa có) =====
  const pl = await prisma.playlist.upsert({
    where: { id: 'pl-demo-1' },
    update: {},
    create: { id: 'pl-demo-1', name: 'My First Playlist', userId: user.id },
  });

  // Thêm track vào playlist nếu chưa có
  await prisma.playlistTrack.upsert({
    where: { playlistId_trackId: { playlistId: pl.id, trackId: 't1' } },
    update: {},
    create: { playlistId: pl.id, trackId: 't1', order: 0 },
  });
  await prisma.playlistTrack.upsert({
    where: { playlistId_trackId: { playlistId: pl.id, trackId: 't2' } },
    update: {},
    create: { playlistId: pl.id, trackId: 't2', order: 1 },
  });

  console.log('✅ Seed xong. userId =', user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
