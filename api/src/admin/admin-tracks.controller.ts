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

      // vì sort isPrimary:-1 nên record đầu tiên gặp sẽ là primary nếu có
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
        isBlocked: t?.isBlocked ?? false,
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
      isBlocked?: boolean;
      // web đang gửi albumTitle, backend không có field này trong Track => bỏ qua để không phá schema
      albumTitle?: string | null;
    },
  ) {
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.genre !== undefined) data.genre = body.genre;
    if (body.albumId !== undefined) data.albumId = body.albumId;
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
    if (body.audioUrl !== undefined) data.audioUrl = body.audioUrl;
    if (body.isBlocked !== undefined) data.isBlocked = body.isBlocked;

    return this.prisma.track.update({
      where: { id },
      data,
    });
  }

  // DELETE mềm
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.prisma.track.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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
