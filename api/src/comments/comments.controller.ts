// api/src/comments/comments.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function extractUserId(req: Request): string {
  // JwtStrategy thường set user.sub hoặc user.userId
  const anyReq: any = req;
  const user = anyReq.user;
  const userId: string | undefined = user?.userId || user?.sub;

  if (!userId) {
    throw new BadRequestException('Missing authenticated user id');
  }
  return userId;
}

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // GET /tracks/:trackId/comments  (public)
  @Get('tracks/:trackId/comments')
  getCommentsForTrack(@Param('trackId') trackId: string) {
    return this.commentsService.listForTrack(trackId);
  }

  // POST /tracks/:trackId/comments  (cần login)
  @Post('tracks/:trackId/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('trackId') trackId: string,
    @Body('content') content: string,
    @Req() req: Request,
  ) {
    const userId = extractUserId(req);
    return this.commentsService.addComment(userId, trackId, content);
  }

  // DELETE /comments/:id  (cần login – chỉ chủ comment hoặc admin mới được xoá)
  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(@Param('id') id: string, @Req() req: Request) {
    const userId = extractUserId(req);
    return this.commentsService.deleteComment(userId, id);
  }
}
