import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  private extractUserId(req: any): string | null {
    const user = req.user;
    if (!user) return null;
    return user.id || user.userId || user.sub || null;
  }

  @UseGuards(JwtAuthGuard)
  @Get('daily')
  async daily(@Req() req: any) {
    const userId = this.extractUserId(req);
    if (!userId) throw new UnauthorizedException('Missing authenticated user id');
    return this.recommendationsService.getDailyMix(userId);
  }
}
