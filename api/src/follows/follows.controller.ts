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
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.followsService.follow(userId, artistId);
  }

  /** UNFOLLOW NGHỆ SĨ – cần đăng nhập */
  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  async unfollow(@Param('id') artistId: string, @Req() req: any) {
    const userId = this.extractUserId(req);
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return this.followsService.unfollow(userId, artistId);
  }

  /** ĐẾM FOLLOWERS – public (không cần login) */
  @Get(':id/follow-count')
  async getFollowCount(@Param('id') artistId: string) {
    return this.followsService.getPublicFollowCount(artistId);
  }
}
