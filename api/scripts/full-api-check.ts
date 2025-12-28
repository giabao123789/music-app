// api/scripts/full-api-check.ts
import fetch from "node-fetch";

const BASE = "http://localhost:3001";

/**
 * ĐÃ ĐIỀN GIÁ TRỊ THẬT:
 *  - TEST_USER_ID: id của user bình thường
 *  - TEST_ARTIST_ID: id của 1 artist thật
 *  - TEST_TRACK_ID: id của 1 track thật
 *  - USER_TOKEN: accessToken của user vừa login (role USER)
 *  - ADMIN_TOKEN: accessToken của admin (role ADMIN)
 */
const TEST_USER_ID = "cmi1uawhz0003vtx0gz9lznhp";
const TEST_ARTIST_ID = "cmi1ndygn0003vtlku0sl4s5c";
const TEST_TRACK_ID = "cmi4jcsy70006vtkomalpvvka";

const USER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWkxdWF3aHowMDAzdnR4MGd6OWx6bmhwIiwiZW1haWwiOiJnb2Fsc25ndXllbjIwMDRAZ21haWwuY29tIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE3NjUyNTk2MjUsImV4cCI6MTc2NTg2NDQyNX0.WL_yCd0TUO7VbAWkYa5YVI4EbR98jtBW1OiUZ5rNLIM";

const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWh5eGxrODUwMDAxdnRtODBzbWFzeTU4IiwiZW1haWwiOiIyMjUxMTIwMjcxQHV0LmVkdS52biIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc2NTM0MTI4OSwiZXhwIjoxNzY1OTQ2MDg5fQ.qFPqFY5Lm-uLSNn9nuNwj2G3DPrY6XL5kFzPs9crrBs";

async function test(
  name: string,
  url: string,
  method: string = "GET",
  token?: string,
  body?: any,
) {
  try {
    const res = await fetch(BASE + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const ok = res.status < 300;
    console.log(`${ok ? "✔" : "❌"} ${name}: ${res.status} ${url}`);

    if (!ok) {
      const text = await res.text();
      console.log("   ↳ Response:", text);
    }
  } catch (err) {
    console.log(`❌ ${name}: FAILED`, err);
  }
}

async function main() {
  console.log("\n🔍 RUNNING FULL API CHECK...\n");

  // ====== PUBLIC ROUTES ======
  await test("Tracks list", "/tracks");
  await test("Artists list", "/artist");
  await test("Home playlists", "/playlists/home");
  await test("System playlists", "/playlists/system");

  // Comments list với trackId thật
  if (TEST_TRACK_ID) {
    await test(
      "Comments list for track",
      `/tracks/${TEST_TRACK_ID}/comments`,
    );
  } else {
    console.log("⚠ SKIP Comments list: chưa set TEST_TRACK_ID");
  }

  // ====== AUTH – TEST LOGIN SAI (EXPECTED 400) ======
  await test("Login (wrong credentials)", "/auth/login", "POST", undefined, {
    email: "wrong@test.com",
    password: "wrong",
  });

  // ====== USER ROUTES (CẦN USER_TOKEN + TEST_USER_ID) ======
  if (USER_TOKEN && TEST_USER_ID) {
    // Playlist của user
    await test(
      "User playlists list",
      `/users/${TEST_USER_ID}/playlists`,
      "GET",
      USER_TOKEN,
    );
    await test(
      "Create playlist for user",
      `/users/${TEST_USER_ID}/playlists`,
      "POST",
      USER_TOKEN,
      { name: "Test Playlist From Script" },
    );

    // Favorites
    if (TEST_TRACK_ID) {
      await test(
        "Toggle favorite track",
        `/favorites/toggle`,
        "POST",
        USER_TOKEN,
        { trackId: TEST_TRACK_ID },
      );
    } else {
      console.log("⚠ SKIP Favorite toggle: chưa set TEST_TRACK_ID");
    }

    await test("List favorites", "/favorites", "GET", USER_TOKEN);

    // Follow / Unfollow artist
    if (TEST_ARTIST_ID) {
      await test(
        "Follow artist",
        `/artist/${TEST_ARTIST_ID}/follow`,
        "POST",
        USER_TOKEN,
      );
      await test(
        "Unfollow artist",
        `/artist/${TEST_ARTIST_ID}/follow`,
        "DELETE",
        USER_TOKEN,
      );

      // Đếm followers (public)
      await test(
        "Get follow count",
        `/artist/${TEST_ARTIST_ID}/follow-count`,
      );
    } else {
      console.log("⚠ SKIP Follow tests: chưa set TEST_ARTIST_ID");
    }

    // Comments (thêm)
    if (TEST_TRACK_ID) {
      await test(
        "Add comment to track",
        `/tracks/${TEST_TRACK_ID}/comments`,
        "POST",
        USER_TOKEN,
        { content: "Test comment from script" },
      );
      // Xoá comment cần id cụ thể → test qua FE/Postman là đẹp nhất
    }
  } else {
    console.log(
      "⚠ SKIP user-protected routes: thiếu USER_TOKEN hoặc TEST_USER_ID",
    );
  }

  // ====== ADMIN ROUTES (CẦN ADMIN_TOKEN) ======
  if (ADMIN_TOKEN) {
    await test("Admin Users", "/admin/users", "GET", ADMIN_TOKEN);
    await test("Admin Tracks", "/admin/tracks", "GET", ADMIN_TOKEN);
    await test("Admin Artists", "/admin/artists", "GET", ADMIN_TOKEN);
    await test("Admin Stats", "/admin/stats", "GET", ADMIN_TOKEN);
  } else {
    console.log("⚠ SKIP admin routes: chưa set ADMIN_TOKEN");
  }

  console.log("\n🎉 DONE — CHECK ABOVE FOR ERRORS\n");
}

main().catch((err) => {
  console.error("❌ Script crashed:", err);
});
