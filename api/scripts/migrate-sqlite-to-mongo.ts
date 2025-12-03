// scripts/migrate-sqlite-to-mongo.ts
import 'dotenv/config';
import Database from 'better-sqlite3';
import { MongoClient } from 'mongodb';
import path from 'path';

function mapDate(v: any): Date | undefined {
  if (!v) return undefined;
  return new Date(v);
}

async function main() {
  // 1. MỞ FILE dev.db (prisma/dev.db)
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  const sqlite = new Database(dbPath, { readonly: true });

  const mongoUrl = process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error('DATABASE_URL không tồn tại trong .env');
  }

  const mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  const db = mongoClient.db(); // lấy tên DB từ URL (music_app)

  console.log('🔄 Bắt đầu migrate dữ liệu từ SQLite -> MongoDB...');

  // 2. ĐỌC DATA TỪ SQLITE
  const users = sqlite.prepare('SELECT * FROM "User"').all();
  const artists = sqlite.prepare('SELECT * FROM "Artist"').all();
  const albums = sqlite.prepare('SELECT * FROM "Album"').all();
  const tracks = sqlite.prepare('SELECT * FROM "Track"').all();
  const trackArtists = sqlite.prepare('SELECT * FROM "TrackArtist"').all();
  const playlists = sqlite.prepare('SELECT * FROM "Playlist"').all();
  const playlistTracks = sqlite.prepare('SELECT * FROM "PlaylistTrack"').all();
  const favorites = sqlite.prepare('SELECT * FROM "Favorite"').all();
  const emailOtps = sqlite.prepare('SELECT * FROM "EmailOtp"').all();
  const follows = sqlite.prepare('SELECT * FROM "Follow"').all();
  const comments = sqlite.prepare('SELECT * FROM "Comment"').all();

  console.log(`👤 Users: ${users.length}`);
  console.log(`🎤 Artists: ${artists.length}`);
  console.log(`💿 Albums: ${albums.length}`);
  console.log(`🎵 Tracks: ${tracks.length}`);
  console.log(`👥 TrackArtists: ${trackArtists.length}`);
  console.log(`📃 Playlists: ${playlists.length}`);
  console.log(`📄 PlaylistTracks: ${playlistTracks.length}`);
  console.log(`❤️ Favorites: ${favorites.length}`);
  console.log(`📧 EmailOtps: ${emailOtps.length}`);
  console.log(`⭐ Follows: ${follows.length}`);
  console.log(`💬 Comments: ${comments.length}`);

  // 3. XÓA DỮ LIỆU CŨ TRONG MONGO (KHÔNG DÙNG TRANSACTION)
  console.log('🧹 Xoá dữ liệu cũ trong Mongo (nếu có)...');
  await Promise.all([
    db.collection('Comment').deleteMany({}),
    db.collection('Follow').deleteMany({}),
    db.collection('EmailOtp').deleteMany({}),
    db.collection('Favorite').deleteMany({}),
    db.collection('PlaylistTrack').deleteMany({}),
    db.collection('Playlist').deleteMany({}),
    db.collection('TrackArtist').deleteMany({}),
    db.collection('Track').deleteMany({}),
    db.collection('Album').deleteMany({}),
    db.collection('Artist').deleteMany({}),
    db.collection('User').deleteMany({}),
  ]);
  // Thử drop index unique Artist_userId_key (nếu tồn tại) để tránh lỗi trùng userId = null
  try {
    await db.collection('Artist').dropIndex('Artist_userId_key');
    console.log('🧹 Đã drop index Artist_userId_key');
  } catch (e: any) {
    // Nếu index không tồn tại thì bỏ qua
    console.log('ℹ️ Không drop được index Artist_userId_key (có thể không tồn tại):', e.message);
  }

  // 4. IMPORT TỪNG BẢNG

  console.log('⬆️ Import Users...');
  if (users.length) {
    await db.collection('User').insertMany(
      users.map((u: any) => ({
        _id: u.id, // id String @map("_id")
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        verified: !!u.verified,
        createdAt: mapDate(u.createdAt),
      })),
    );
  }

    console.log('⬆️ Import Artists...');
  if (artists.length) {
    const artistDocs = artists.map((a: any) => {
      const doc: any = {
        _id: a.id,
        name: a.name,
        avatar: a.avatar,
        mainGenre: a.mainGenre,
        bio: a.bio,
      };

      // Chỉ set userId nếu KHÁC null
      if (a.userId) {
        doc.userId = a.userId;
      }

      return doc;
    });

    await db.collection('Artist').insertMany(artistDocs);
  }


  console.log('⬆️ Import Albums...');
  if (albums.length) {
    await db.collection('Album').insertMany(
      albums.map((al: any) => ({
        _id: al.id,
        title: al.title,
        coverUrl: al.coverUrl,
        artistId: al.artistId,
        releaseAt: mapDate(al.releaseAt),
      })),
    );
  }

  console.log('⬆️ Import Tracks...');
  if (tracks.length) {
    await db.collection('Track').insertMany(
      tracks.map((t: any) => ({
        _id: t.id,
        title: t.title,
        duration: t.duration,
        coverUrl: t.coverUrl,
        audioUrl: t.audioUrl,
        artistId: t.artistId,
        createdAt: mapDate(t.createdAt),
        albumId: t.albumId,
        genre: t.genre,
        lyrics: t.lyrics,
        popularity: t.popularity,
      })),
    );
  }

  console.log('⬆️ Import TrackArtists...');
  if (trackArtists.length) {
    await db.collection('TrackArtist').insertMany(
      trackArtists.map((ta: any) => ({
        // SQLite không có id, mình tạo id từ trackId + artistId
        _id: `${ta.trackId}_${ta.artistId}`,
        trackId: ta.trackId,
        artistId: ta.artistId,
        isPrimary: !!ta.isPrimary,
      })),
    );
  }

  console.log('⬆️ Import Playlists...');
  if (playlists.length) {
    await db.collection('Playlist').insertMany(
      playlists.map((pl: any) => ({
        _id: pl.id,
        name: pl.name,
        userId: pl.userId,
        createdAt: mapDate(pl.createdAt),
      })),
    );
  }

  console.log('⬆️ Import PlaylistTracks...');
  if (playlistTracks.length) {
    await db.collection('PlaylistTrack').insertMany(
      playlistTracks.map((pt: any) => ({
        _id: pt.id,
        playlistId: pt.playlistId,
        trackId: pt.trackId,
        order: pt.order,
        addedAt: mapDate(pt.addedAt),
      })),
    );
  }

  console.log('⬆️ Import Favorites...');
  if (favorites.length) {
    await db.collection('Favorite').insertMany(
      favorites.map((f: any) => ({
        // SQLite không có id, tạo id từ userId + trackId
        _id: `${f.userId}_${f.trackId}`,
        userId: f.userId,
        trackId: f.trackId,
        createdAt: mapDate(f.createdAt),
      })),
    );
  }

  console.log('⬆️ Import EmailOtps...');
  if (emailOtps.length) {
    await db.collection('EmailOtp').insertMany(
      emailOtps.map((e: any) => ({
        _id: e.id,
        email: e.email,
        code: e.code,
        purpose: e.purpose,
        expiresAt: mapDate(e.expiresAt),
        createdAt: mapDate(e.createdAt),
      })),
    );
  }

  console.log('⬆️ Import Follows...');
  if (follows.length) {
    await db.collection('Follow').insertMany(
      follows.map((fo: any) => ({
        _id: fo.id,
        userId: fo.userId,
        artistId: fo.artistId,
        createdAt: mapDate(fo.createdAt),
      })),
    );
  }

  console.log('⬆️ Import Comments...');
  if (comments.length) {
    await db.collection('Comment').insertMany(
      comments.map((c: any) => ({
        _id: c.id,
        userId: c.userId,
        trackId: c.trackId,
        content: c.content,
        createdAt: mapDate(c.createdAt),
      })),
    );
  }

  console.log('✅ Migrate hoàn tất!');

  sqlite.close();
  await mongoClient.close();
}

main().catch((e) => {
  console.error('❌ Lỗi migrate:', e);
  process.exit(1);
});
