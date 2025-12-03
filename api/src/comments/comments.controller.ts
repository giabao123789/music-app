import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { CommentsService } from "./comments.service";

@Controller("tracks")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  private extractUserId(req: any): string {
    const userId =
      req.user?.userId || req.user?.id || req.user?.sub || req.user?.user?.id;

    if (!userId) {
      throw new BadRequestException("Missing authenticated user id");
    }
    return userId;
  }

  @Get(":trackId/comments")
  async list(@Param("trackId") trackId: string) {
    return this.commentsService.listForTrack(trackId);
  }

  @Post(":trackId/comments")
  async add(
    @Req() req: any,
    @Param("trackId") trackId: string,
    @Body("content") content: string,
  ) {
    const userId = this.extractUserId(req);
    return this.commentsService.add(userId, trackId, content);
  }

  @Delete("comments/:id")
  async delete(@Req() req: any, @Param("id") id: string) {
    const userId = this.extractUserId(req);
    return this.commentsService.delete(userId, id);
  }
}
