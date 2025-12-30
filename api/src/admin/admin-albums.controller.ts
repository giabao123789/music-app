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
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';

/**
 * Admin Albums Controller
 * Base: /admin/albums
 *
 * ✅ Album schema KHÔNG có createdAt -> không dùng orderBy createdAt
 * ✅ Sort: releaseAt desc, fallback id desc
 * ✅ Thêm createdAt "ảo" = min(Track.createdAt) trong album (nếu có track)
 * ✅ Không refactor module/guard, giữ đúng rule dự án
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/albums')
export class AdminAlbumsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /admin/albums?page=1&limit=20&q=...
   * Return: items có thêm field createdAt (virtual) nếu tính được
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
          artist: {
            select: { id: true, name: true, avatar: true },
          },
          _count: {
            select: { tracks: true },
          },
        },
      }),
      this.prisma.album.count({ where }),
    ]);

    // ===== createdAt ẢO: lấy min Track.createdAt theo albumId =====
    const albumIds = items.map((x) => x.id).filter(Boolean);

    // groupBy có thể tuỳ version Prisma/Mongo; mình làm theo cách "an toàn":
    // lấy danh sách track (albumId, createdAt) orderBy createdAt asc rồi pick cái đầu cho mỗi album
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
      return {
        ...a,
        createdAt, // virtual field (Date | null)
      };
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
   * Return album + tracks + createdAt (virtual = min track createdAt)
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

    // virtual createdAt: min createdAt trong tracks (nếu có)
    const createdAt =
      album.tracks && album.tracks.length
        ? album.tracks
            .map((t) => t.createdAt)
            .sort((a, b) => a.getTime() - b.getTime())[0]
        : null;

    return {
      ...album,
      createdAt,
    };
  }

  /**
   * PATCH /admin/albums/:id
   * body: { title?: string; coverUrl?: string | null; releaseAt?: string | null; artistId?: string }
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

    return updated;
  }

  /**
   * DELETE /admin/albums/:id
   * ✅ An toàn: gỡ albumId khỏi Track trước rồi mới xóa Album
   */
  @Delete(':id')
  async deleteAlbum(@Param('id') id: string) {
    await this.prisma.track.updateMany({
      where: { albumId: id },
      data: { albumId: null },
    });

    await this.prisma.album.delete({ where: { id } });

    return { ok: true };
  }
}
