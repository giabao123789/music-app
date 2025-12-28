// api/src/artist/artist.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Prisma + Mongo: dữ liệu seed có thể KHÔNG có field deletedAt.
   * => cần coi "chưa xoá mềm" = deletedAt null OR deletedAt isSet:false
   */
  private notDeletedWhere(): any {
    return {
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    };
  }

  /**
   * Đảm bảo user có Artist profile.
   */
  async ensureArtistProfile(userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { Artist: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.Artist) {
      return user.Artist;
    }

    const artist = await this.prisma.artist.create({
      data: {
        userId: user.id,
        name: user.name || user.email.split('@')[0] || 'New Artist',
        avatar: null,
      },
    });

    return artist;
  }

  // ========== /artist/me ==========

  async getMe(userId: string) {
    return this.ensureArtistProfile(userId);
  }

  // ✅ FIX: lấy track chưa bị xoá mềm (deletedAt null OR missing)
  async myTracks(userId: string) {
    const artist = await this.ensureArtistProfile(userId);

    try {
      return await this.prisma.track.findMany({
        where: {
          artistId: artist.id,
          ...this.notDeletedWhere(),
        },
        include: { album: true, artist: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      const isDateTimeBug =
        msg.includes('Inconsistent column data') &&
        msg.includes('Failed to convert') &&
        msg.includes("'createdAt'");

      if (!isDateTimeBug) throw e;

      const normalizeDate = (v: any) => {
        if (v instanceof Date) return v;
        if (typeof v === 'string') {
          const s = v.replace(/^"+|"+$/g, '');
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        }
        if (v && typeof v === 'object' && typeof v.$date === 'string') {
          const s = v.$date.replace(/^"+|"+$/g, '');
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        }
        return null;
      };

      // ✅ FIX: deletedAt null OR not exists
      const res: any = await (this.prisma as any).$runCommandRaw({
        find: 'Track',
        filter: {
          artistId: artist.id,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
      });

      const tracks: any[] = res?.cursor?.firstBatch ?? [];

      tracks.sort((a, b) => {
        const da = normalizeDate(a?.createdAt);
        const db = normalizeDate(b?.createdAt);
        const ta = da ? da.getTime() : -Infinity;
        const tb = db ? db.getTime() : -Infinity;
        return tb - ta;
      });

      return tracks.map((t) => ({
        id: t._id,
        title: t.title,
        audioUrl: t.audioUrl,
        coverUrl: t.coverUrl,
        duration: t.duration ?? 0,
        genre: t.genre ?? null,
        album: t.albumId ? { id: t.albumId, title: null } : null,
        artist: { id: artist.id, name: artist.name },
        popularity: t.popularity ?? 0,
      }));
    }
  }

  async myAlbums(userId: string) {
    const artist = await this.ensureArtistProfile(userId);

    const albums = await this.prisma.album.findMany({
      where: { artistId: artist.id },
      orderBy: {
        releaseAt: 'desc',
      },
    });

    return albums;
  }

  // ✅ NEW: artist xem danh sách người theo dõi của mình
  async myFollowers(userId: string) {
    const artist = await this.ensureArtistProfile(userId);

    // 1) Thử Prisma trước (nhanh + đúng kiểu)
    try {
      const rows = await (this.prisma as any).follow.findMany({
        where: { artistId: artist.id },
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      const items = (rows || [])
        .map((r: any) => {
          const u = r?.user;
          if (!u?.id) return null;

          const displayName =
            (typeof u.name === 'string' && u.name.trim()
              ? u.name.trim()
              : null) ??
            (typeof u.email === 'string' && u.email.includes('@')
              ? u.email.split('@')[0]
              : null);

          return { id: u.id, name: displayName };
        })
        .filter(Boolean);

      return { items, total: items.length };
    } catch (e) {
      // 2) Fallback Mongo raw
      try {
        const followRes: any = await (this.prisma as any).$runCommandRaw({
          find: 'Follow',
          filter: { artistId: artist.id },
        });

        const followDocs: any[] = followRes?.cursor?.firstBatch ?? [];
        const userIds = Array.from(
          new Set(
            followDocs
              .map((f) => f?.userId)
              .filter((x) => typeof x === 'string' && x.length > 0),
          ),
        );

        if (userIds.length === 0) {
          return { items: [], total: 0 };
        }

        const usersRes: any = await (this.prisma as any).$runCommandRaw({
          find: 'User',
          filter: { _id: { $in: userIds } },
        });

        const users: any[] = usersRes?.cursor?.firstBatch ?? [];
        const userMap = new Map(users.map((u) => [u?._id, u]));

        const items = userIds
          .map((id) => {
            const u = userMap.get(id);
            if (!u) return null;

            const name =
              (typeof u.name === 'string' && u.name.trim()
                ? u.name.trim()
                : null) ??
              (typeof u.email === 'string' && u.email.includes('@')
                ? u.email.split('@')[0]
                : null);

            return { id: String(u._id), name };
          })
          .filter(Boolean);

        return { items, total: items.length };
      } catch (e2) {
        console.error('[artist] myFollowers error', e2);
        throw e2;
      }
    }
  }

  /**
   * Update thông tin profile của nghệ sĩ
   * body: { name?, avatar?, bio?, mainGenre? }
   */
  async updateProfile(userId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const data: any = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
    }

    if (typeof body.avatar === 'string' && body.avatar.trim()) {
      data.avatar = body.avatar.trim();
    }

    if (body.bio !== undefined) {
      data.bio =
        typeof body.bio === 'string' && body.bio.trim()
          ? body.bio.trim()
          : null;
    }

    if (body.mainGenre !== undefined) {
      data.mainGenre = body.mainGenre || null;
    }

    if (!Object.keys(data).length) {
      return artist;
    }

    await (this.prisma as any).$runCommandRaw({
      update: 'Artist',
      updates: [
        {
          q: { _id: artist.id },
          u: { $set: data },
        },
      ],
    });

    const updated = await this.prisma.artist.findUnique({
      where: { id: artist.id },
    });

    return updated ?? artist;
  }

  /**
   * Tạo track mới
   */
  async uploadTrack(userId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const { title, coverUrl, audioUrl, albumId } = body;

    if (!title || typeof title !== 'string') {
      throw new BadRequestException('title is required');
    }

    if (!coverUrl || typeof coverUrl !== 'string') {
      throw new BadRequestException('coverUrl is required');
    }

    if (!audioUrl || typeof audioUrl !== 'string') {
      throw new BadRequestException('audioUrl is required');
    }

    const duration =
      typeof body.duration === 'number' && body.duration >= 0
        ? body.duration
        : 0;

    const allowedGenres = new Set([
      'POP',
      'RNB',
      'INDIE',
      'EDM',
      'RAP',
      'BALLAD',
    ]);

    const genre =
      typeof body.genre === 'string' && allowedGenres.has(body.genre.trim())
        ? body.genre.trim()
        : null;

    const id = randomUUID();
    const now = new Date();

    const track = await this.prisma.track.create({
      data: {
        id,
        title: title.trim(),
        coverUrl: coverUrl.trim(),
        audioUrl: audioUrl.trim(),
        duration,
        artistId: artist.id,
        albumId: albumId || null,
        genre,
        lyrics:
          typeof body.lyrics === 'string' && body.lyrics.trim()
            ? body.lyrics.trim()
            : null,
        popularity: 0,
        createdAt: now,
        deletedAt: null,
      } as any,
      include: {
        artist: true,
        album: true,
      },
    });

    return track;
  }

  /**
   * Cập nhật track
   */
  async updateTrack(userId: string, trackId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track || track.artistId !== artist.id) {
      throw new NotFoundException('Track not found');
    }

    const data: any = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      data.title = body.title.trim();
    }

    if (body.albumId !== undefined) {
      data.albumId = body.albumId || null;
    }

    if (typeof body.coverUrl === 'string' && body.coverUrl.trim()) {
      data.coverUrl = body.coverUrl.trim();
    }

    if (typeof body.duration === 'number' && body.duration >= 0) {
      data.duration = body.duration;
    }

    if (body.lyrics !== undefined) {
      data.lyrics =
        typeof body.lyrics === 'string' && body.lyrics.trim()
          ? body.lyrics.trim()
          : null;
    }

    if (!Object.keys(data).length) {
      return track;
    }

    await (this.prisma as any).$runCommandRaw({
      update: 'Track',
      updates: [
        {
          q: { _id: trackId },
          u: { $set: data },
        },
      ],
    });

    const updated = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    return updated ?? track;
  }

  /**
   * Xoá một track của chính nghệ sĩ (hard delete + clear relations)
   */
  async deleteTrack(userId: string, trackId: string) {
    const meArtist = await this.prisma.artist.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!meArtist) {
      throw new Error('Không tìm thấy artist của bạn');
    }

    const track = await this.prisma.track.findFirst({
      where: { id: trackId, artistId: meArtist.id },
      select: { id: true },
    });

    if (!track) {
      throw new Error('Không tìm thấy bài hát hoặc bạn không có quyền xoá');
    }

    await this.prisma.favorite.deleteMany({ where: { trackId } });
    await this.prisma.playlistTrack.deleteMany({ where: { trackId } });
    await this.prisma.comment.deleteMany({ where: { trackId } });
    await this.prisma.trackArtist.deleteMany({ where: { trackId } });

    try {
      await (this.prisma as any).$runCommandRaw({
        delete: 'Favorite',
        deletes: [{ q: { trackId }, limit: 0 }],
      });
    } catch (_) {}

    try {
      await (this.prisma as any).$runCommandRaw({
        delete: 'PlaylistTrack',
        deletes: [{ q: { trackId }, limit: 0 }],
      });
    } catch (_) {}

    try {
      await (this.prisma as any).$runCommandRaw({
        delete: 'Comment',
        deletes: [{ q: { trackId }, limit: 0 }],
      });
    } catch (_) {}

    try {
      await (this.prisma as any).$runCommandRaw({
        delete: 'TrackArtist',
        deletes: [{ q: { trackId }, limit: 0 }],
      });
    } catch (_) {}

    const remainFav = await this.prisma.favorite.count({ where: { trackId } });
    if (remainFav > 0) {
      throw new Error(
        `Không thể xoá vì vẫn còn ${remainFav} favorite trỏ tới track này (dữ liệu bẩn).`,
      );
    }

    try {
      await (this.prisma as any).$runCommandRaw({
        delete: 'Track',
        deletes: [{ q: { _id: trackId }, limit: 1 }],
      });
    } catch (e) {
      await this.prisma.track.deleteMany({ where: { id: trackId } });
    }

    return { ok: true, deleted: 1 };
  }

  /**
   * Tạo album mới
   */
  async createAlbum(userId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const releaseAt =
      body.releaseAt && typeof body.releaseAt === 'string'
        ? new Date(body.releaseAt)
        : null;

    const albumId = randomUUID();

    await (this.prisma as any).$runCommandRaw({
      insert: 'Album',
      documents: [
        {
          _id: albumId,
          title: body.title,
          artistId: artist.id,
          coverUrl: body.coverUrl ?? null,
          ...(releaseAt ? { releaseAt } : {}),
        },
      ],
    });

    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    const createdTracks: any[] = [];

    const allowedGenres = new Set([
      'POP',
      'RNB',
      'INDIE',
      'EDM',
      'RAP',
      'BALLAD',
    ]);

    if (Array.isArray(body.tracks)) {
      for (const t of body.tracks) {
        const duration =
          typeof t.duration === 'number'
            ? t.duration
            : typeof t.durationMs === 'number'
              ? Math.round(t.durationMs / 1000)
              : 0;

        const genre =
          typeof t.genre === 'string' && allowedGenres.has(t.genre.trim())
            ? t.genre.trim()
            : null;

        const track = await this.prisma.track.create({
          data: {
            id: randomUUID(),
            title: typeof t.title === 'string' ? t.title.trim() : '',
            duration,
            audioUrl: t.audioUrl,
            coverUrl: t.coverUrl ?? body.coverUrl ?? '',
            artistId: artist.id,
            albumId: albumId,
            genre: genre as any,
            lyrics:
              typeof t.lyrics === 'string' && t.lyrics.trim()
                ? t.lyrics.trim()
                : null,
            popularity: 0,
            createdAt: new Date(),
            deletedAt: null,
          } as any,
        });

        // ✅ giữ nguyên: đảm bảo TrackArtist tồn tại
        await this.prisma.trackArtist.upsert({
          where: {
            trackId_artistId: {
              trackId: track.id,
              artistId: artist.id,
            },
          },
          update: {
            isPrimary: true,
          },
          create: {
            trackId: track.id,
            artistId: artist.id,
            isPrimary: true,
          },
        });

        createdTracks.push(track);
      }
    }

    return {
      ...(album ?? {
        id: albumId,
        title: body.title,
        artistId: artist.id,
        coverUrl: body.coverUrl ?? null,
        releaseAt: releaseAt ?? null,
      }),
      tracks: createdTracks,
    };
  }

  /**
   * Cập nhật album
   */
  async updateAlbum(userId: string, albumId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album || album.artistId !== artist.id) {
      throw new NotFoundException('Album not found');
    }

    const data: any = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      data.title = body.title.trim();
    }

    if (typeof body.coverUrl === 'string' && body.coverUrl.trim()) {
      data.coverUrl = body.coverUrl.trim();
    }

    if (body.releaseAt !== undefined) {
      if (body.releaseAt) {
        const d = new Date(body.releaseAt);
        if (!isNaN(d.getTime())) data.releaseAt = d;
      } else {
        data.releaseAt = null;
      }
    }

    if (!Object.keys(data).length) {
      return album;
    }

    return this.prisma.album.update({
      where: { id: albumId },
      data,
    });
  }

  // ========== PUBLIC ROUTES (USER) ==========

  async listArtists() {
    const artists = await this.prisma.artist.findMany({
      include: {
        _count: {
          select: {
            tracks: true,
            albums: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const followersCounts = await Promise.all(
      artists.map((a) =>
        this.prisma.follow.count({
          where: { artistId: a.id },
        }),
      ),
    );

    // ✅ FIX: count track trực tiếp (not deleted) + track qua TrackArtist
    const tracksCounts = await Promise.all(
      artists.map(async (a) => {
        // 1) track trực tiếp
        let direct = 0;
        try {
          direct = await this.prisma.track.count({
            where: { artistId: a.id, ...this.notDeletedWhere() },
          });
        } catch {
          try {
            const r: any = await (this.prisma as any).$runCommandRaw({
              count: 'Track',
              query: {
                artistId: a.id,
                $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
              },
            });
            direct = Number(r?.n ?? 0) || 0;
          } catch {
            direct = 0;
          }
        }

        // 2) track qua TrackArtist
        let join = 0;
        try {
          join = await this.prisma.trackArtist.count({
            where: { artistId: a.id },
          });
        } catch {
          try {
            const r: any = await (this.prisma as any).$runCommandRaw({
              count: 'TrackArtist',
              query: { artistId: a.id },
            });
            join = Number(r?.n ?? 0) || 0;
          } catch {
            join = 0;
          }
        }

        // giữ logic hiển thị đủ lớn (tránh bị thiếu)
        return Math.max(direct, direct + join);
      }),
    );

    return artists.map((a, idx) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      mainGenre: a.mainGenre,
      tracksCount: tracksCounts[idx] ?? a._count.tracks,
      albumsCount: a._count.albums,
      followersCount: followersCounts[idx],
    }));
  }

  // ✅ FIX: artist detail = union(direct Track.artistId + TrackArtist) và notDeleted = null OR missing
  async getArtistById(id: string) {
    try {
      const artist = await this.prisma.artist.findUnique({
        where: { id },
        include: {
          albums: {
            orderBy: { releaseAt: 'desc' },
          },
        },
      });

      if (!artist) {
        throw new NotFoundException('Artist not found');
      }

      const [directTracks, joins] = await Promise.all([
        this.prisma.track.findMany({
          where: { artistId: id, ...this.notDeletedWhere() },
          include: { artist: true, album: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.trackArtist.findMany({
          where: { artistId: id },
          select: { trackId: true },
        }),
      ]);

      const joinTrackIds = Array.from(
        new Set((joins || []).map((x) => x.trackId).filter(Boolean)),
      );

      let joinTracks: any[] = [];
      if (joinTrackIds.length) {
        joinTracks = await this.prisma.track.findMany({
          where: {
            id: { in: joinTrackIds },
            ...this.notDeletedWhere(),
          },
          include: { artist: true, album: true },
          orderBy: { createdAt: 'desc' },
        });
      }

      const map = new Map<string, any>();
      for (const t of [...directTracks, ...joinTracks]) {
        if (!t?.id) continue;
        if (!map.has(t.id)) map.set(t.id, t);
      }
      const tracks = Array.from(map.values());

      const tracksByAlbumId: Record<string, number> = tracks.reduce(
        (acc, t: any) => {
          if (t.albumId) acc[t.albumId] = (acc[t.albumId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        id: artist.id,
        userId: artist.userId,
        name: artist.name,
        avatar: artist.avatar,
        bio: artist.bio,
        mainGenre: artist.mainGenre,
        tracksCount: tracks.length,
        albums: artist.albums.map((al) => ({
          id: al.id,
          title: al.title,
          coverUrl: al.coverUrl,
          releaseAt: al.releaseAt,
          tracksCount: tracksByAlbumId[al.id] || 0,
        })),
        tracks: tracks.map((t: any) => ({
          id: t.id,
          title: t.title,
          audioUrl: t.audioUrl,
          coverUrl: t.coverUrl,
          duration: t.duration,
          genre: t.genre ?? null,
          popularity: t.popularity ?? 0,
          album: t.album ? { id: t.album.id, title: t.album.title } : null,
          artist: t.artist
            ? { id: t.artist.id, name: t.artist.name }
            : { id: artist.id, name: artist.name },
        })),
      };
    } catch (e: any) {
      // ===== fallback DateTime bug, giữ nguyên style, chỉ FIX notDeleted + TrackArtist =====
      const msg = String(e?.message || '');
      const isDateTimeBug =
        msg.includes('Inconsistent column data') &&
        msg.includes('Failed to convert') &&
        msg.includes("'createdAt'");

      if (!isDateTimeBug) throw e;

      const normalizeDate = (v: any) => {
        if (v instanceof Date) return v;
        if (typeof v === 'string') {
          const s = v.replace(/^"+|"+$/g, '');
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        }
        if (v && typeof v === 'object' && typeof v.$date === 'string') {
          const s = v.$date.replace(/^"+|"+$/g, '');
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        }
        return null;
      };

      const artistRes: any = await (this.prisma as any).$runCommandRaw({
        find: 'Artist',
        filter: { _id: id },
        limit: 1,
      });

      const artistDoc = artistRes?.cursor?.firstBatch?.[0];
      if (!artistDoc) throw new NotFoundException('Artist not found');

      const albumsRes: any = await (this.prisma as any).$runCommandRaw({
        find: 'Album',
        filter: { artistId: id },
      });
      const albums: any[] = albumsRes?.cursor?.firstBatch ?? [];

      albums.sort((a, b) => {
        const da = a?.releaseAt ? normalizeDate(a.releaseAt) : null;
        const db = b?.releaseAt ? normalizeDate(b.releaseAt) : null;
        const ta = da ? da.getTime() : -Infinity;
        const tb = db ? db.getTime() : -Infinity;
        return tb - ta;
      });

      const directRes: any = await (this.prisma as any).$runCommandRaw({
        find: 'Track',
        filter: {
          artistId: id,
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        },
      });
      const directTracks: any[] = directRes?.cursor?.firstBatch ?? [];

      const joinRes: any = await (this.prisma as any).$runCommandRaw({
        find: 'TrackArtist',
        filter: { artistId: id },
      });
      const joinDocs: any[] = joinRes?.cursor?.firstBatch ?? [];
      const joinIds = Array.from(
        new Set(
          joinDocs
            .map((x) => x?.trackId)
            .filter((x) => typeof x === 'string' && x.length > 0),
        ),
      );

      let joinTracks: any[] = [];
      if (joinIds.length) {
        const joinTracksRes: any = await (this.prisma as any).$runCommandRaw({
          find: 'Track',
          filter: {
            _id: { $in: joinIds },
            $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
          },
        });
        joinTracks = joinTracksRes?.cursor?.firstBatch ?? [];
      }

      const map = new Map<string, any>();
      for (const t of [...directTracks, ...joinTracks]) {
        const tid = String(t?._id || t?.id || '');
        if (!tid) continue;
        if (!map.has(tid)) map.set(tid, t);
      }
      const tracks = Array.from(map.values());

      tracks.sort((a, b) => {
        const da = normalizeDate(a?.createdAt);
        const db = normalizeDate(b?.createdAt);
        const ta = da ? da.getTime() : -Infinity;
        const tb = db ? db.getTime() : -Infinity;
        return tb - ta;
      });

      const albumMap = new Map<string, any>();
      for (const al of albums) albumMap.set(al._id, al);

      const tracksByAlbumId: Record<string, number> = {};
      for (const t of tracks) {
        if (t.albumId)
          tracksByAlbumId[t.albumId] = (tracksByAlbumId[t.albumId] || 0) + 1;
      }

      return {
        id: artistDoc._id,
        userId: artistDoc.userId,
        name: artistDoc.name,
        avatar: artistDoc.avatar ?? null,
        bio: artistDoc.bio ?? null,
        mainGenre: artistDoc.mainGenre ?? null,
        tracksCount: tracks.length,
        albums: albums.map((al) => ({
          id: al._id,
          title: al.title,
          coverUrl: al.coverUrl ?? null,
          releaseAt: al.releaseAt ?? null,
          tracksCount: tracksByAlbumId[al._id] || 0,
        })),
        tracks: tracks.map((t) => {
          const tid = String(t?._id || t?.id);
          const al = t.albumId ? albumMap.get(t.albumId) : null;
          return {
            id: tid,
            title: t.title,
            audioUrl: t.audioUrl,
            coverUrl: t.coverUrl,
            duration: t.duration ?? 0,
            genre: t.genre ?? null,
            popularity: t.popularity ?? 0,
            album: al ? { id: al._id, title: al.title } : null,
            artist: { id: artistDoc._id, name: artistDoc.name },
          };
        }),
      };
    }
  }

  async deleteAlbum(userId: string, albumId: string) {
    const artist = await this.ensureArtistProfile(userId);

    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album || album.artistId !== artist.id) {
      throw new NotFoundException('Album not found');
    }

    await this.prisma.track.updateMany({
      where: { albumId: album.id, artistId: artist.id },
      data: { albumId: null },
    });

    await this.prisma.album.delete({
      where: { id: album.id },
    });

    return { success: true };
  }

  /**
   * Reorder tracks trong album (KHÔNG đổi schema).
   */
  async reorderAlbumTracks(userId: string, albumId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    if (!albumId) {
      throw new BadRequestException('albumId is required');
    }

    const ids: string[] =
      (Array.isArray(body?.trackIds) && body.trackIds) ||
      (Array.isArray(body?.orderedTrackIds) && body.orderedTrackIds) ||
      (Array.isArray(body?.ids) && body.ids) ||
      [];

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('trackIds is required');
    }

    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album || album.artistId !== artist.id) {
      throw new NotFoundException('Album not found');
    }

    const tracks = await this.prisma.track.findMany({
      where: {
        id: { in: ids },
        albumId: albumId,
        artistId: artist.id,
      },
      include: {
        artist: true,
        album: true,
      },
    });

    const foundSet = new Set(tracks.map((t) => t.id));
    const missing = ids.filter((id) => !foundSet.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Some tracks are invalid or not in this album: ${missing.join(', ')}`,
      );
    }

    const byId = new Map(tracks.map((t) => [t.id, t]));
    const ordered = ids.map((id) => byId.get(id)!);

    return { success: true, albumId, tracks: ordered };
  }

  // NOTE: updateTrackAlbum hiện đang được controller gọi
  async updateTrackAlbum(userId: string, trackId: string, body: any) {
    return this.updateTrack(userId, trackId, body);
  }
}
