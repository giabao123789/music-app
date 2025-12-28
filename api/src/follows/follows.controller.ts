import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FollowsService } from './follows.service';

/**
 * ✅ GIỮ NGUYÊN endpoint cũ:
 * - POST   /artist/:id/follow
 * - DELETE /artist/:id/follow
 * - GET    /artist/:id/follow-count
 *
 * ✅ THÊM alias mới (để FE gọi /artists/following không bị 404):
 * - GET    /artists/following
 */

@Controller('artist')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  /** Lấy userId từ req.user với nhiều kiểu payload khác nhau */
  private extractUserId(req: any): string | null {
    const user = req.user;
    if (!user) return null;
    return user.id || user.userId || user.sub || null;
  }

  /** FOLLOW NGHỆ SĨ – cần đăng nhập */
  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(@Param('id') artistId: string, @Req() req: any) {
    const userId = this.extractUserId(req);
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');
    return this.followsService.follow(userId, artistId);
  }

  /** UNFOLLOW NGHỆ SĨ – cần đăng nhập */
  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  async unfollow(@Param('id') artistId: string, @Req() req: any) {
    const userId = this.extractUserId(req);
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');
    return this.followsService.unfollow(userId, artistId);
  }

  /** ĐẾM FOLLOWERS – public (không cần login) */
  @Get(':id/follow-count')
  async getFollowCount(@Param('id') artistId: string) {
    return this.followsService.getPublicFollowCount(artistId);
  }

  /**
   * ✅ Endpoint “an toàn” dưới /artist (ít bị route khác nuốt hơn):
   * GET /artist/me/following
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/following')
  async myFollowing(@Req() req: any) {
    const userId = this.extractUserId(req);
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');
    return this.followsService.getMyFollowingArtists(userId);
  }
}

/**
 * ✅ ALIAS endpoint cho FE (tránh bị /artists/:id nuốt):
 * GET /artists/following
 */
@Controller('artists')
export class ArtistsFollowingController {
  constructor(private readonly followsService: FollowsService) {}

  private extractUserId(req: any): string | null {
    const user = req.user;
    if (!user) return null;
    return user.id || user.userId || user.sub || null;
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  async getMyFollowing(@Req() req: any) {
    const userId = this.extractUserId(req);
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');
    return this.followsService.getMyFollowingArtists(userId);
  }
}
