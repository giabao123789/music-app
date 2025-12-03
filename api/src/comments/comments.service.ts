import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForTrack(trackId: string) {
    return this.prisma.comment.findMany({
      where: { trackId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async add(userId: string, trackId: string, content: string) {
    if (!content || !content.trim()) {
      throw new Error("Content is required");
    }

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });
    if (!track) {
      throw new NotFoundException("Track not found");
    }

    return this.prisma.comment.create({
      data: {
        userId,
        trackId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException("You cannot delete this comment");
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return { success: true };
  }
}
