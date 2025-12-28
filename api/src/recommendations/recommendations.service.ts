import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalizeGenre(g: any): string | null {
  if (!g) return null;
  const s = String(g).trim().toUpperCase();
  const allowed = new Set(['POP', 'RNB', 'INDIE', 'EDM', 'RAP', 'BALLAD']);
  return allowed.has(s) ? s : null;
}

function pickTopGenres(tracks: any[], limit = 2): string[] {
  const cnt: Record<string, number> = {};
  for (const t of tracks) {
    const g = normalizeGenre(t?.genre);
    if (!g) continue;
    cnt[g] = (cnt[g] || 0) + 1;
  }
  return Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g);
}

function uniqueById(list: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const x of list) {
    const id = x?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(x);
  }
  return out;
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily Mix:
   * - genre user hay thích nhất (tạm dựa trên Favorites vì chưa có ListeningHistory)
   * - artist user follow
   * - sort popularity + random nhẹ
   */
  async getDailyMix(userId: string) {
    // 1) artists user follow
    const follows = await this.prisma.follow.findMany({
      where: { userId },
      select: { artistId: true },
    });
    const followedArtistIds = follows.map((f) => f.artistId).filter(Boolean);

    // 2) favorites -> lấy genre user thích
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      select: { trackId: true },
      take: 200,
    });
    const favTrackIds = favs.map((f) => f.trackId).filter(Boolean);

    let favTracks: any[] = [];
    if (favTrackIds.length) {
      favTracks = await this.prisma.track.findMany({
        where: { id: { in: favTrackIds } as any },
        select: { id: true, genre: true },
      });
    }

    const topGenres = pickTopGenres(favTracks, 2); // lấy 1-2 genre top

    // 3) lấy candidates
    const bucket: any[] = [];

    // 3a) theo artist follow
    if (followedArtistIds.length) {
      const byFollow = await this.prisma.track.findMany({
        where: {
          artistId: { in: followedArtistIds } as any,
          deletedAt: null as any,
        } as any,
        include: { artist: true, album: true },
        take: 80,
        orderBy: { createdAt: 'desc' },
      });
      bucket.push(...byFollow);
    }

    // 3b) theo genre yêu thích
    if (topGenres.length) {
      const byGenre = await this.prisma.track.findMany({
        where: {
          genre: { in: topGenres } as any,
          deletedAt: null as any,
        } as any,
        include: { artist: true, album: true },
        take: 120,
        orderBy: { popularity: 'desc' },
      });
      bucket.push(...byGenre);
    }

    // 3c) fallback nếu user chưa follow/fav gì
    if (!bucket.length) {
      const fallback = await this.prisma.track.findMany({
        where: { deletedAt: null as any } as any,
        include: { artist: true, album: true },
        take: 120,
        orderBy: { popularity: 'desc' },
      });
      bucket.push(...fallback);
    }

    // 4) dedupe + score (popularity + random nhẹ)
    const deduped = uniqueById(bucket);
    const scored = deduped
      .map((t) => ({
        t,
        score: (typeof t.popularity === 'number' ? t.popularity : 0) + Math.random() * 10,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((x) => x.t);

    return {
      id: `daily_${userId}`,
      title: 'Daily Mix',
      subtitle:
        topGenres.length || followedArtistIds.length
          ? `Gợi ý theo ${topGenres.length ? `genre: ${topGenres.join(', ')}` : ''}${
              topGenres.length && followedArtistIds.length ? ' • ' : ''
            }${followedArtistIds.length ? `nghệ sĩ bạn follow` : ''}`
          : 'Gợi ý theo bài hot',
      genres: topGenres,
      tracks: scored.map((t: any) => ({
        id: t.id,
        title: t.title,
        duration: t.duration ?? 0,
        coverUrl: t.coverUrl ?? null,
        audioUrl: t.audioUrl ?? null,
        lyrics: t.lyrics ?? null,
        genre: normalizeGenre(t.genre),
        popularity: typeof t.popularity === 'number' ? t.popularity : 0,
        artist: t.artist ? { id: t.artist.id, name: t.artist.name } : null,
        album: t.album ? { id: t.album.id, title: t.album.title } : null,
        artistId: t.artistId ?? (t.artist?.id ?? null),
      })),
    };
  }
}
