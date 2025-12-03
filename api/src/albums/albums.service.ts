// src/albums/albums.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAlbumById(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        artist: true,
        tracks: {
          include: {
            artist: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!album) {
      throw new NotFoundException("Album not found");
    }

    return {
      id: album.id,
      title: album.title,
      coverUrl: album.coverUrl,
      releaseAt: album.releaseAt,
      artist: album.artist
        ? {
            id: album.artist.id,
            name: album.artist.name,
          }
        : null,
      tracks: album.tracks.map((t) => ({
        id: t.id,
        title: t.title,
        audioUrl: t.audioUrl,
        coverUrl: t.coverUrl,
        duration: t.duration,
        genre: t.genre,
        artist: t.artist
          ? {
              id: t.artist.id,
              name: t.artist.name,
            }
          : null,
      })),
    };
  }
}
