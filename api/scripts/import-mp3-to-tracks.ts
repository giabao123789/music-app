/* api/scripts/import-mp3-to-tracks.ts */

import { PrismaClient, Genre } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * ==== CONFIG ====
 */
const MUSIC_DIR = path.resolve(__dirname, "../../web/public/music");
const COVER_DIR = path.resolve(__dirname, "../uploads/images/tracks");

// 👉 artist mặc định (admin / seed)
const DEFAULT_ARTIST_ID = "SYSTEM_ADMIN_ARTIST";

/**
 * ==== RANDOM UTILS ====
 */
const GENRES: Genre[] = [
  Genre.POP,
  Genre.RNB,
  Genre.INDIE,
  Genre.EDM,
  Genre.RAP,
  Genre.BALLAD,
];

function randomGenre(): Genre {
  return GENRES[Math.floor(Math.random() * GENRES.length)];
}

function randomDuration(): number {
  return Math.floor(150 + Math.random() * 60); // 150–210
}
function randomCover(covers: string[]): string {
  if (!covers.length) return "";
  const f = covers[Math.floor(Math.random() * covers.length)];
  return `/uploads/images/tracks/${f}`;
}


function normalizeTitle(filename: string): string {
  return filename
    .replace(/\.mp3$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ==== MAIN ====
 */
async function main() {
  console.log("🔍 Scanning mp3 files...");
  if (!fs.existsSync(MUSIC_DIR)) {
    throw new Error("❌ web/public/music không tồn tại");
  }

  const mp3Files = fs
    .readdirSync(MUSIC_DIR)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  if (!mp3Files.length) {
    console.log("⚠️ Không có file mp3 nào");
    return;
  }

  console.log(`🎵 Found ${mp3Files.length} mp3 files`);

  /**
   * ==== PREPARE COVER LIST ====
   */
  let covers: string[] = [];
  if (fs.existsSync(COVER_DIR)) {
    covers = fs
      .readdirSync(COVER_DIR)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
  }

  /**
   * ==== ENSURE ARTIST ====
   */
  const artist = await prisma.artist.upsert({
    where: { id: DEFAULT_ARTIST_ID },
    update: {},
    create: {
      id: DEFAULT_ARTIST_ID,
      name: "System Music",
      bio: "Auto imported tracks",
    },
  });

  /**
   * ==== IMPORT LOOP ====
   */
  let created = 0;
  let skipped = 0;

  for (const file of mp3Files) {
    const title = normalizeTitle(file);

    // tránh import trùng
    const existed = await prisma.track.findFirst({
      where: { audioUrl: `/music/${file}` },
      select: { id: true },
    });

    if (existed) {
      skipped++;
      continue;
    }

    await prisma.track.create({
      data: {
        id: crypto.randomUUID(),
        title,
        audioUrl: `/music/${file}`,
        coverUrl: randomCover(covers),
        duration: randomDuration(),
        artistId: artist.id,
        genre: randomGenre(),
        popularity: 0,
        createdAt: new Date(),
      },
    });

    created++;
  }

  console.log("✅ IMPORT DONE");
  console.log("➕ Created:", created);
  console.log("⏭️ Skipped:", skipped);
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
