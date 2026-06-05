// api/src/admin/admin-tracks.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard, AdminGuard)
@Roles(Role.ADMIN)
@Controller('admin/tracks')
export class AdminTracksController {
  constructor(private prisma: PrismaService) {}

  // ===== Helpers (Mongo raw) =====
  private normalizeDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;

    // Mongo Extended JSON kiểu { $date: "..." }
    if (typeof v === 'object' && typeof v.$date === 'string') {
      const d = new Date(v.$date);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // string ISO
    if (typeof v === 'string') {
      const s = v.replace(/^"+|"+$/g, '');
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
  }

  private escapeRegex(input: string) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ===== NEW: Notification helpers (KHÔNG đụng Prisma schema) =====
  private async getPrimaryArtistIdForTrack(
    trackId: string,
  ): Promise<string | null> {
    // 1) ưu tiên TrackArtist.isPrimary=true (nếu có)
    try {
      const taRes: any = await (this.prisma as any).$runCommandRaw({
        find: 'TrackArtist',
        filter: { trackId },
        sort: { isPrimary: -1 },
        limit: 1,
      });

      const first = taRes?.cursor?.firstBatch?.[0];
      if (first && typeof first.artistId === 'string') return first.artistId;
    } catch {
      // ignore
    }

    // 2) fallback track.artistId (raw)
    try {
      const t: any = await (this.prisma as any).$runCommandRaw({
        find: 'Track',
        filter: { _id: trackId },
        limit: 1,
      });

      const trackDoc = t?.cursor?.firstBatch?.[0];
      if (trackDoc && typeof trackDoc.artistId === 'string')
        return trackDoc.artistId;
    } catch {
      // ignore
    }

    // 3) fallback prisma (nếu track id là field id đúng)
    try {
      const track = await this.prisma.track.findUnique({
        where: { id: trackId },
        select: { artistId: true },
      });
      if (track?.artistId) return track.artistId;
    } catch {
      // ignore
    }

    return null;
  }

  private async createNotification(params: {
    artistId: string;
    type: 'TRACK_UPDATED' | 'TRACK_DELETED';
    title: string;
    message: string;
    entity?: { type: 'Track'; id: string };
    payload?: any;
  }) {
    // Collection "Notification" (tự tạo trong Mongo)
    // structure đề xuất:
    // { _id, artistId, type, title, message, entity, payload, createdAt, readAt }
    const doc = {
      _id: `noti_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      artistId: params.artistId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity: params.entity ?? null,
      payload: params.payload ?? null,
      createdAt: new Date(),
      readAt: null, // null = chưa đọc
    };

    try {
      await (this.prisma as any).$runCommandRaw({
        insert: 'Notification',
        documents: [doc],
      });
    } catch (e) {
      // Không cho fail cả API nếu notification lỗi (để không phá chức năng admin)
      // console.error('[Notification] insert failed', e);
    }
  }

  private buildTrackUpdateMessage(before: any, after: any, patch: any) {
    const changed: string[] = [];

    const safe = (v: any) =>
      v === undefined ? '(không có)' : v === null ? 'null' : String(v);

    if (
      patch.title !== undefined &&
      safe(before?.title) !== safe(after?.title)
    ) {
      changed.push(`Tên: "${safe(before?.title)}" → "${safe(after?.title)}"`);
    }
    if (
      patch.genre !== undefined &&
      safe(before?.genre) !== safe(after?.genre)
    ) {
      changed.push(`Thể loại: ${safe(before?.genre)} → ${safe(after?.genre)}`);
    }
    if (
      patch.albumId !== undefined &&
      safe(before?.albumId) !== safe(after?.albumId)
    ) {
      changed.push(
        `AlbumId: ${safe(before?.albumId)} → ${safe(after?.albumId)}`,
      );
    }
    if (
      patch.coverUrl !== undefined &&
      safe(before?.coverUrl) !== safe(after?.coverUrl)
    ) {
      changed.push(
        `CoverUrl: ${safe(before?.coverUrl)} → ${safe(after?.coverUrl)}`,
      );
    }
    if (
      patch.audioUrl !== undefined &&
      safe(before?.audioUrl) !== safe(after?.audioUrl)
    ) {
      changed.push(
        `AudioUrl: ${safe(before?.audioUrl)} → ${safe(after?.audioUrl)}`,
      );
    }

    if (!changed.length) return 'Admin đã cập nhật thông tin bài hát.';
    return `Admin đã cập nhật bài hát:\n- ${changed.join('\n- ')}`;
  }

  // GET /admin/tracks?search=...&genre=...&artist=...&from=...&to=...&page=1&limit=200
  // ✅ FIX: dùng Mongo raw để list đủ + normalize createdAt + map artistName ổn định
  @Get()
  async listTracks(
    @Query('search') search?: string,
    @Query('genre') genre?: string,
    @Query('artist') artist?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(parseInt(page || '1', 10) || 1, 1);
    const limitRaw = parseInt(limit || '200', 10) || 200;
    const limitNum = Math.min(Math.max(limitRaw, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    // ✅ mặc định chỉ lấy track chưa xoá mềm
    // Mongo: { deletedAt: null } match cả null và field missing
    const filter: any = { deletedAt: null };

    if (genre && genre.trim()) {
      filter.genre = genre.trim();
    }

    // createdAt range
    if ((from && from.trim()) || (to && to.trim())) {
      filter.createdAt = {};
      if (from && from.trim()) {
        const dFrom = new Date(`${from.trim()}T00:00:00.000Z`);
        if (!Number.isNaN(dFrom.getTime())) filter.createdAt.$gte = dFrom;
      }
      if (to && to.trim()) {
        const dTo = new Date(`${to.trim()}T23:59:59.999Z`);
        if (!Number.isNaN(dTo.getTime())) filter.createdAt.$lte = dTo;
      }
      if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
    }

    // search title (regex contains, i)
    if (search && search.trim()) {
      const q = search.trim();
      filter.title = { $regex: this.escapeRegex(q), $options: 'i' };
    }

    const artistNeedFilter = !!(artist && artist.trim());
    const artistQuery = (artist || '').trim().toLowerCase();

    // 1) count total (theo filter DB)
    const countRes: any = await (this.prisma as any).$runCommandRaw({
      count: 'Track',
      query: filter,
    });
    const total: number = typeof countRes?.n === 'number' ? countRes.n : 0;

    // 2) find page (sort createdAt desc)
    const findRes: any = await (this.prisma as any).$runCommandRaw({
      find: 'Track',
      filter,
      sort: { createdAt: -1 },
      skip,
      limit: limitNum,
    });

    const tracks: any[] = findRes?.cursor?.firstBatch ?? [];

    // ===== Build ids =====
    const trackIds = tracks
      .map((t) => t?._id)
      .filter((x) => typeof x === 'string' && x.length > 0);

    // 3) TrackArtist: ưu tiên isPrimary=true
    const taRes: any =
      trackIds.length > 0
        ? await (this.prisma as any).$runCommandRaw({
            find: 'TrackArtist',
            filter: { trackId: { $in: trackIds } },
            sort: { isPrimary: -1 }, // true trước
          })
        : { cursor: { firstBatch: [] } };

    const trackArtists: any[] = taRes?.cursor?.firstBatch ?? [];

    // trackId -> artistId (ưu tiên isPrimary)
    const artistIdByTrack = new Map<string, string>();
    for (const ta of trackArtists) {
      const tId = ta?.trackId;
      const aId = ta?.artistId;
      if (typeof tId !== 'string' || typeof aId !== 'string') continue;

      if (!artistIdByTrack.has(tId)) artistIdByTrack.set(tId, aId);
    }

    // 4) fetch Artists (từ TrackArtist.artistId hoặc track.artistId)
    const artistIdsSet = new Set<string>();
    for (const t of tracks) {
      const tId = String(t?._id);
      const fromTA = artistIdByTrack.get(tId);
      if (fromTA) artistIdsSet.add(fromTA);
      if (typeof t?.artistId === 'string') artistIdsSet.add(t.artistId);
    }
    const artistIds = Array.from(artistIdsSet);

    const artistsRes: any =
      artistIds.length > 0
        ? await (this.prisma as any).$runCommandRaw({
            find: 'Artist',
            filter: { _id: { $in: artistIds } },
          })
        : { cursor: { firstBatch: [] } };

    const artists: any[] = artistsRes?.cursor?.firstBatch ?? [];
    const artistNameById = new Map<string, string | null>();
    for (const a of artists) {
      artistNameById.set(String(a?._id), a?.name ?? null);
    }

    // 5) fetch Albums để có albumTitle (nếu có albumId)
    const albumIdsSet = new Set<string>();
    for (const t of tracks) {
      if (typeof t?.albumId === 'string' && t.albumId.length > 0) {
        albumIdsSet.add(t.albumId);
      }
    }
    const albumIds = Array.from(albumIdsSet);

    const albumsRes: any =
      albumIds.length > 0
        ? await (this.prisma as any).$runCommandRaw({
            find: 'Album',
            filter: { _id: { $in: albumIds } },
          })
        : { cursor: { firstBatch: [] } };

    const albums: any[] = albumsRes?.cursor?.firstBatch ?? [];
    const albumTitleById = new Map<string, string | null>();
    for (const al of albums) {
      albumTitleById.set(String(al?._id), al?.title ?? null);
    }

    // 6) build items (createdAt -> ISO string chuẩn)
    let items = tracks.map((t) => {
      const id = String(t?._id);

      const taArtistId = artistIdByTrack.get(id);
      const finalArtistId =
        taArtistId || (typeof t?.artistId === 'string' ? t.artistId : null);

      const artistName = finalArtistId
        ? artistNameById.get(String(finalArtistId)) ?? null
        : null;

      const createdAtDate = this.normalizeDate(t?.createdAt);
      const createdAt = createdAtDate ? createdAtDate.toISOString() : null;

      const albumId = typeof t?.albumId === 'string' ? t.albumId : null;
      const albumTitle = albumId ? albumTitleById.get(albumId) ?? null : null;

      return {
        id,
        title: t?.title ?? '',
        artistName,
        albumTitle,
        artistId: finalArtistId ?? null,
        genre: t?.genre ?? null,
        coverUrl: t?.coverUrl ?? null,
        popularity: typeof t?.popularity === 'number' ? t.popularity : 0,
        createdAt,
      };
    });

    // 7) apply artist filter sau khi đã có artistName
    if (artistNeedFilter) {
      items = items.filter((x) => {
        const name = (x.artistName || '').toLowerCase();
        return name.includes(artistQuery);
      });
    }

    const totalForUi = artistNeedFilter ? items.length : total;

    return {
      items,
      total: totalForUi,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(Math.ceil(totalForUi / limitNum), 1),
    };
  }

  // PATCH /admin/tracks/:id
  @Patch(':id')
  async updateTrackMeta(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      genre?: string | null;
      albumId?: string | null;
      coverUrl?: string | null;
      audioUrl?: string | null;
      albumTitle?: string | null; // ignore
    },
  ) {
    // Lấy bản ghi trước khi update để tạo message diff
    const before = await this.prisma.track.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Track not found');

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.genre !== undefined) data.genre = body.genre;
    if (body.albumId !== undefined) data.albumId = body.albumId;
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
    if (body.audioUrl !== undefined) data.audioUrl = body.audioUrl;

    const updated = await this.prisma.track.update({
      where: { id },
      data,
    });

    // ===== NEW: tạo notification cho artist =====
    const artistId = await this.getPrimaryArtistIdForTrack(id);
    if (artistId) {
      const message = this.buildTrackUpdateMessage(before, updated, body);
      await this.createNotification({
        artistId,
        type: 'TRACK_UPDATED',
        title: 'Admin đã cập nhật bài hát',
        message,
        entity: { type: 'Track', id },
        payload: {
          trackId: id,
          before: {
            title: before.title ?? null,
            genre: before.genre ?? null,
            albumId: before.albumId ?? null,
            coverUrl: before.coverUrl ?? null,
            audioUrl: before.audioUrl ?? null,
          },
          after: {
            title: updated.title ?? null,
            genre: updated.genre ?? null,
            albumId: updated.albumId ?? null,
            coverUrl: updated.coverUrl ?? null,
            audioUrl: updated.audioUrl ?? null,
          },
        },
      });
    }

    return updated;
  }

  // DELETE mềm
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    const before = await this.prisma.track.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Track not found');

    const updated = await this.prisma.track.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const artistId = await this.getPrimaryArtistIdForTrack(id);
    if (artistId) {
      await this.createNotification({
        artistId,
        type: 'TRACK_DELETED',
        title: 'Bài hát đã bị xoá (xoá mềm)',
        message: `Admin đã xoá bài hát: "${before.title ?? '(không có tên)'}".`,
        entity: { type: 'Track', id },
        payload: { trackId: id, title: before.title ?? null },
      });
    }

    return updated;
  }

  // GET /admin/tracks/:id
  @Get(':id')
  async getTrackById(@Param('id') id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: {
        album: true,
        artist: true,
      },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    return track;
  }
}
