// api/src/favorites/favorites.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtService } from '@nestjs/jwt';

@Controller('favorites')
export class FavoritesController {
  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Helper: lấy userId từ Authorization Bearer token
   * (hoặc từ cookie accessToken nếu bạn dùng cookie)
   */
  private extractUserId(req: any): string | undefined {
    let token: string | null = null;

    // 1. Ưu tiên lấy từ Authorization: Bearer xxx
    const auth = req.headers['authorization'] as string | undefined;
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.substring(7);
    }

    // 2. Nếu không có, thử lấy từ cookie accessToken (nếu bạn dùng cookie)
    if (!token && req.cookies && req.cookies['accessToken']) {
      token = req.cookies['accessToken'];
    }

    if (!token) return undefined;

    try {
      const payload: any = this.jwtService.verify(token);

      // support nhiều kiểu payload khác nhau
      return (
        payload.sub ||
        payload.id ||
        payload.userId || // nhiều code cũ hay dùng userId
        undefined
      );
    } catch {
      return undefined;
    }
  }

  @Post('toggle')
  async toggle(@Req() req: any, @Body('trackId') trackId: string) {
    const userId = this.extractUserId(req);
    return this.favoritesService.toggle(userId, trackId);
  }

  @Get()
  async list(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.favoritesService.list(userId);
  }
}
