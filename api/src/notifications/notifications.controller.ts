// api/src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArtistService } from '../artist/artist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('artist/me')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artistService: ArtistService,
  ) {}

  // dùng lại style extract userId giống bên artist.controller (KHÔNG đụng logic cũ)
  private extractUserId(req: any): string {
    const authHeader =
      req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new BadRequestException('Missing Authorization header');
    }

    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];

    if (!token) {
      throw new BadRequestException('Invalid Authorization header');
    }

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) throw new Error('Invalid JWT structure');

      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);

      const userId = payload.sub || payload.id || payload.userId;
      if (!userId) throw new Error('No user id in token payload');

      return userId;
    } catch {
      throw new BadRequestException('Invalid JWT token');
    }
  }

  // GET /artist/me/notifications?limit=20&unreadOnly=1
  @Get('notifications')
  async myNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = this.extractUserId(req);
    const artist = await this.artistService.ensureArtistProfile(userId);

    const take = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 50);
    const onlyUnread = unreadOnly === '1' || unreadOnly === 'true';

    const filter: any = { artistId: artist.id };
    if (onlyUnread) filter.readAt = null;

    // dùng Mongo raw vì Notification là collection tự tạo
    const res: any = await (this.prisma as any).$runCommandRaw({
      find: 'Notification',
      filter,
      sort: { createdAt: -1 },
      limit: take,
    });

    const items: any[] = res?.cursor?.firstBatch ?? [];

    // normalize
    return {
      items: items.map((n) => ({
        id: String(n?._id),
        artistId: n?.artistId ?? null,
        type: n?.type ?? null,
        title: n?.title ?? '',
        message: n?.message ?? '',
        entity: n?.entity ?? null,
        payload: n?.payload ?? null,
        createdAt: n?.createdAt ?? null,
        readAt: n?.readAt ?? null,
      })),
      total: items.length,
    };
  }

  // PATCH /artist/me/notifications/:id/read
  @Patch('notifications/:id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    const artist = await this.artistService.ensureArtistProfile(userId);

    // chỉ cho mark read của đúng artist
    await (this.prisma as any).$runCommandRaw({
      update: 'Notification',
      updates: [
        {
          q: { _id: id, artistId: artist.id },
          u: { $set: { readAt: new Date() } },
          upsert: false,
          multi: false,
        },
      ],
    });

    return { ok: true };
  }
}
