/* api/scripts/seed-demo-music.js */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// thư mục mp3 demo của bạn
const DEMO_DIR = path.resolve(__dirname, "../../web/public/music");

function slugifyFilename(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function main() {
  if (!fs.existsSync(DEMO_DIR)) {
    console.error("❌ Không thấy thư mục:", DEMO_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(DEMO_DIR)
    .filter((f) => f.toLowerCase().endsWith(".mp3"));

  console.log("🎵 Demo mp3 files:", files.length);

  // ✅ Tạo artist demo (1 lần) để gán cho toàn bộ demo tracks
  const demoArtist = await prisma.artist.upsert({
    where: { id: "demo-artist" },
    update: {},
    create: {
      id: "demo-artist",
      name: "Demo Library",
      avatar: null,
      userId: null,
      bio: "Các bài demo nằm trong web/public/music",
      mainGenre: "OTHER",
    },
  });

  let created = 0;
  let existed = 0;

  // ✅ duration demo: đặt mặc định 210s để Player không bị duration=0
  const DEFAULT_DURATION = 210;

  for (const file of files) {
    const title = file.replace(/\.mp3$/i, "");
    const slug = slugifyFilename(file);
    const id = `demo-${slug}`; // deterministic id để seed lại không bị nhân đôi

    const audioUrl = `/music/${file}`; // ✅ demo ở web/public/music
    const coverUrl = ""; // ✅ để rỗng cho UI hiện "No cover" (không vi phạm schema vì vẫn là string)

    // Nếu đã tồn tại thì skip
    const found = await prisma.track.findUnique({ where: { id } });
    if (found) {
      existed++;
      continue;
    }

    await prisma.track.create({
      data: {
        id,
        title,
        duration: DEFAULT_DURATION,
        coverUrl,
        audioUrl,
        artistId: demoArtist.id,
        albumId: null,
        genre: "OTHER",
        lyrics: null,
        popularity: 0,
        createdAt: new Date(), // ✅ đúng rule DateTime
        deletedAt: null,
      },
    });

    created++;
    if (created % 100 === 0) console.log("✅ created", created);
  }

  console.log("DONE ✅ created:", created, "| existed:", existed);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
