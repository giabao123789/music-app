// api/src/favorites/favorites.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

function extractUserIdFromReq(req: Request): string {
  const u: any = (req as any).user;

  const userId =
    u?.userId ?? // kiểu hay dùng trong Nest
    u?.id ?? // nếu validate() trả về { id: ... }
    u?.sub ?? // nếu trả về payload gốc { sub, email, role }
    u?._id ??
    null;

  if (!userId) {
    throw new BadRequestException('Missing authenticated user id');
  }

  return String(userId);
}

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /** Lấy danh sách bài hát yêu thích của user hiện tại */
  @Get()
  async list(@Req() req: Request) {
    const userId = extractUserIdFromReq(req);
    return this.favoritesService.list(userId);
  }

  /** Toggle yêu thích 1 bài hát (body: { trackId }) */
  @Post('toggle')
  async toggle(@Req() req: Request, @Body('trackId') trackId: string) {
    const userId = extractUserIdFromReq(req);
    return this.favoritesService.toggle(userId, trackId);
  }
}
