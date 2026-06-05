// api/src/admin/admin-albums.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Delete,
  Patch,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/albums')
export class AdminAlbumsController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== NEW: Notification helpers (KHÔNG đụng Prisma schema) =====
  private async createNotification(params: {
    artistId: string;
    type: 'ALBUM_UPDATED' | 'ALBUM_DELETED';
    title: string;
    message: string;
    entity?: { type: 'Album'; id: string };
    payload?: any;
  }) {
    const doc = {
      _id: `noti_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      artistId: params.artistId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity: params.entity ?? null,
      payload: params.payload ?? null,
      createdAt: new Date(),
      readAt: null,
    };

    try {
      await (this.prisma as any).$runCommandRaw({
        insert: 'Notification',
        documents: [doc],
      });
    } catch {
      // không phá admin flow
    }
  }

  /**
   * GET /admin/albums?page=1&limit=20&q=...
   */
  @Get()
  async listAlbums(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('q') q?: string,
  ) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

    const where: any = {};
    if (q && q.trim()) {
      const kw = q.trim();
      where.OR = [
        { title: { contains: kw, mode: 'insensitive' } },
        { artist: { name: { contains: kw, mode: 'insensitive' } } },
      ];
    }

    const skip = (safePage - 1) * safeLimit;
    const orderBy: any = [{ releaseAt: 'desc' }, { id: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.album.findMany({
        where,
        orderBy,
        skip,
        take: safeLimit,
        include: {
          artist: { select: { id: true, name: true, avatar: true } },
          _count: { select: { tracks: true } },
        },
      }),
      this.prisma.album.count({ where }),
    ]);

    // ===== createdAt ẢO: lấy min Track.createdAt theo albumId =====
    const albumIds = items.map((x) => x.id).filter(Boolean);
    let createdAtByAlbum = new Map<string, Date>();

    if (albumIds.length) {
      const tracks = await this.prisma.track.findMany({
        where: { albumId: { in: albumIds } },
        select: { albumId: true, createdAt: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      for (const t of tracks) {
        if (!t.albumId) continue;
        if (!createdAtByAlbum.has(t.albumId)) {
          createdAtByAlbum.set(t.albumId, t.createdAt);
        }
      }
    }

    const mappedItems = items.map((a: any) => {
      const createdAt = createdAtByAlbum.get(a.id) || null;
      return { ...a, createdAt };
    });

    return {
      items: mappedItems,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * GET /admin/albums/:id
   */
  @Get(':id')
  async getAlbum(@Param('id') id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: { select: { id: true, name: true, avatar: true } },
        tracks: {
          select: {
            id: true,
            title: true,
            duration: true,
            coverUrl: true,
            audioUrl: true,
            popularity: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
        _count: { select: { tracks: true } },
      },
    });

    if (!album) return album;

    const createdAt =
      album.tracks && album.tracks.length
        ? album.tracks
            .map((t) => t.createdAt)
            .sort((a, b) => a.getTime() - b.getTime())[0]
        : null;

    return { ...album, createdAt };
  }

  /**
   * PATCH /admin/albums/:id
   */
  @Patch(':id')
  async updateAlbum(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      coverUrl?: string | null;
      releaseAt?: string | null;
      artistId?: string;
    },
  ) {
    const before = await this.prisma.album.findUnique({
      where: { id },
      select: { id: true, title: true, coverUrl: true, releaseAt: true, artistId: true },
    });
    if (!before) throw new NotFoundException('Album not found');

    const data: any = {};

    if (typeof body.title !== 'undefined') {
      const t = String(body.title || '').trim();
      if (!t) throw new BadRequestException('title is required');
      data.title = t;
    }

    if (typeof body.coverUrl !== 'undefined') {
      data.coverUrl = body.coverUrl ?? null;
    }

    if (typeof body.artistId !== 'undefined') {
      const a = String(body.artistId || '').trim();
      if (!a) throw new BadRequestException('artistId is invalid');
      data.artistId = a;
    }

    if (typeof body.releaseAt !== 'undefined') {
      if (body.releaseAt === null || body.releaseAt === '') {
        data.releaseAt = null;
      } else {
        const d = new Date(body.releaseAt);
        if (isNaN(d.getTime())) {
          throw new BadRequestException('releaseAt must be ISO date string');
        }
        data.releaseAt = d;
      }
    }

    const updated = await this.prisma.album.update({
      where: { id },
      data,
      include: {
        artist: { select: { id: true, name: true, avatar: true } },
        _count: { select: { tracks: true } },
      },
    });

    // ===== NEW: notification về album cho artist sở hữu album =====
    const changed: string[] = [];
    const safe = (v: any) => (v === undefined ? '(không có)' : v === null ? 'null' : String(v));
    if (body.title !== undefined && safe(before.title) !== safe(updated.title)) {
      changed.push(`Tên album: "${safe(before.title)}" → "${safe(updated.title)}"`);
    }
    if (body.coverUrl !== undefined && safe(before.coverUrl) !== safe((updated as any).coverUrl)) {
      changed.push(`CoverUrl: ${safe(before.coverUrl)} → ${safe((updated as any).coverUrl)}`);
    }
    if (body.releaseAt !== undefined && safe(before.releaseAt) !== safe((updated as any).releaseAt)) {
      changed.push(`ReleaseAt: ${safe(before.releaseAt)} → ${safe((updated as any).releaseAt)}`);
    }
    if (body.artistId !== undefined && safe(before.artistId) !== safe((updated as any).artistId)) {
      changed.push(`ArtistId: ${safe(before.artistId)} → ${safe((updated as any).artistId)}`);
    }

    const msg = changed.length
      ? `Admin đã cập nhật album:\n- ${changed.join('\n- ')}`
      : `Admin đã cập nhật album "${updated.title ?? '(không có tên)'}".`;

    await this.createNotification({
      artistId: (updated as any).artist?.id || (updated as any).artistId || before.artistId,
      type: 'ALBUM_UPDATED',
      title: 'Admin đã cập nhật album',
      message: msg,
      entity: { type: 'Album', id },
      payload: { albumId: id },
    });

    return updated;
  }

  /**
   * DELETE /admin/albums/:id
   * ✅ An toàn: gỡ albumId khỏi Track trước rồi mới xóa Album
   */
  @Delete(':id')
  async deleteAlbum(@Param('id') id: string) {
    const before = await this.prisma.album.findUnique({
      where: { id },
      select: { id: true, title: true, artistId: true },
    });
    if (!before) throw new NotFoundException('Album not found');

    await this.prisma.track.updateMany({
      where: { albumId: id },
      data: { albumId: null },
    });

    await this.prisma.album.delete({ where: { id } });

    // ===== NEW: notification =====
    await this.createNotification({
      artistId: before.artistId,
      type: 'ALBUM_DELETED',
      title: 'Album đã bị xoá',
      message: `Admin đã xoá album: "${before.title ?? '(không có tên)'}".`,
      entity: { type: 'Album', id },
      payload: { albumId: id, title: before.title ?? null },
    });

    return { ok: true };
  }
}
