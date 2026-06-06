import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// ─── Config ───────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: "dbme7rkvz",
  api_key: "979655726741136",
  api_secret: "TaHyLJeXu_4Y_1JVOc0BqRydEEk",
});

const MUSIC_FOLDER = "./public/music";
const CLOUDINARY_FOLDER = "music";
const RESULTS_FILE = "./upload_results.json";
const CONCURRENT = 3;

// ─── Sanitize filename → safe public_id ──────────────────────────────────────
// Cloudinary public_id only allows: a-z, A-Z, 0-9, _, -, /
// Strategy: transliterate Vietnamese + strip/replace unsafe chars
function sanitizePublicId(filename) {
  const name = path.basename(filename, ".mp3");

  const map = {
    à:'a',á:'a',â:'a',ã:'a',ä:'a',å:'a',
    è:'e',é:'e',ê:'e',ë:'e',
    ì:'i',í:'i',î:'i',ï:'i',
    ò:'o',ó:'o',ô:'o',õ:'o',ö:'o',
    ù:'u',ú:'u',û:'u',ü:'u',
    ý:'y',ÿ:'y',
    ñ:'n',ç:'c',
    // Vietnamese
    ă:'a',ắ:'a',ặ:'a',ằ:'a',ẳ:'a',ẵ:'a',
    â:'a',ấ:'a',ậ:'a',ầ:'a',ẩ:'a',ẫ:'a',
    đ:'d',
    ê:'e',ế:'e',ệ:'e',ề:'e',ể:'e',ễ:'e',
    ô:'o',ố:'o',ộ:'o',ồ:'o',ổ:'o',ỗ:'o',
    ơ:'o',ớ:'o',ợ:'o',ờ:'o',ở:'o',ỡ:'o',
    ư:'u',ứ:'u',ự:'u',ừ:'u',ử:'u',ữ:'u',
    ị:'i',ỉ:'i',ĩ:'i',
    ạ:'a',ả:'a',ã:'a',
    ọ:'o',ỏ:'o',
    ụ:'u',ủ:'u',
    ỳ:'y',ỵ:'y',ỷ:'y',ỹ:'y',
    // uppercase Vietnamese
    À:'A',Á:'A',Â:'A',Ã:'A',Ä:'A',Å:'A',
    È:'E',É:'E',Ê:'E',Ë:'E',
    Ì:'I',Í:'I',Î:'I',Ï:'I',
    Ò:'O',Ó:'O',Ô:'O',Õ:'O',Ö:'O',
    Ù:'U',Ú:'U',Û:'U',Ü:'U',
    Ý:'Y',
    Ñ:'N',Ç:'C',
    Ă:'A',Ắ:'A',Ặ:'A',Ằ:'A',Ẳ:'A',Ẵ:'A',
    Â:'A',Ấ:'A',Ậ:'A',Ầ:'A',Ẩ:'A',Ẫ:'A',
    Đ:'D',
    Ê:'E',Ế:'E',Ệ:'E',Ề:'E',Ể:'E',Ễ:'E',
    Ô:'O',Ố:'O',Ộ:'O',Ồ:'O',Ổ:'O',Ỗ:'O',
    Ơ:'O',Ớ:'O',Ợ:'O',Ờ:'O',Ở:'O',Ỡ:'O',
    Ư:'U',Ứ:'U',Ự:'U',Ừ:'U',Ử:'U',Ữ:'U',
    Ị:'I',Ỉ:'I',Ĩ:'I',
    Ạ:'A',Ả:'A',
    Ọ:'O',Ỏ:'O',
    Ụ:'U',Ủ:'U',
    Ỳ:'Y',Ỵ:'Y',Ỷ:'Y',Ỹ:'Y',
  };

  const transliterated = name
    .split('')
    .map(c => map[c] ?? c)
    .join('');

  return `${CLOUDINARY_FOLDER}/` + transliterated
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')  // remove all non-alphanumeric except space/dash/underscore
    .replace(/\s+/g, '_')               // spaces → underscore
    .replace(/_+/g, '_')                // collapse multiple underscores
    .replace(/^_|_$/g, '')              // trim leading/trailing underscores
    .toLowerCase();
}

// ─── Load existing results (skip already uploaded, keyed by ORIGINAL filename) ─
let results = {};
if (fs.existsSync(RESULTS_FILE)) {
  results = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
  console.log(`📂 Resuming — ${Object.keys(results).length} files already uploaded.\n`);
}

// ─── Get all MP3 files ────────────────────────────────────────────────────────
const files = fs.readdirSync(MUSIC_FOLDER).filter((f) => f.toLowerCase().endsWith(".mp3"));
const total = files.length;
console.log(`🎵 Found ${total} MP3 files in ${MUSIC_FOLDER}\n`);

// ─── Upload ───────────────────────────────────────────────────────────────────
let done = 0;
let skipped = 0;
let failed = [];

async function uploadFile(filename) {
  const originalName = path.basename(filename, ".mp3");

  // Skip if already uploaded (keyed by original name)
  if (results[originalName]) {
    skipped++;
    done++;
    return;
  }

  const publicId = sanitizePublicId(filename);
  const filePath = path.join(MUSIC_FOLDER, filename);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      public_id: publicId,
      overwrite: false,
    });

    // Store by original name so the app can look up by song title
    results[originalName] = {
      url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      duration: result.duration,
    };

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    done++;
    const percent = ((done / total) * 100).toFixed(1);
    console.log(`[${percent}%] ✅ ${filename}`);
  } catch (err) {
    done++;
    failed.push(filename);
    const percent = ((done / total) * 100).toFixed(1);
    console.log(`[${percent}%] ❌ FAILED: ${filename} — ${err.message}`);
  }
}

for (let i = 0; i < files.length; i += CONCURRENT) {
  const batch = files.slice(i, i + CONCURRENT);
  await Promise.all(batch.map(uploadFile));
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const newUploads = Object.keys(results).length - (skipped > 0 ? Object.keys(results).length - (done - failed.length - skipped) : 0);
console.log("\n─────────────────────────────────────────");
console.log(`✅ Uploaded : ${done - failed.length - skipped} new files`);
console.log(`⏭️  Skipped  : ${skipped} (already on Cloudinary)`);
console.log(`❌ Failed   : ${failed.length}`);
if (failed.length > 0) {
  console.log("   Failed files:", failed.join(", "));
}
console.log(`\n📄 Results saved to: ${RESULTS_FILE}`);
console.log("   Use this file to map song names → Cloudinary URLs in your app.");
