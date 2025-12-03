import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Đảm bảo user có Artist profile.
   */
  async ensureArtistProfile(userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { Artist: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.Artist) {
      return user.Artist;
    }

    const artist = await this.prisma.artist.create({
      data: {
        userId: user.id,
        name: user.name || user.email.split('@')[0] || 'New Artist',
        avatar: null,
      },
    });

    return artist;
  }

  // ========== /artist/me ==========

  async getMe(userId: string) {
    return this.ensureArtistProfile(userId);
  }

  async myTracks(userId: string) {
    const artist = await this.ensureArtistProfile(userId);

    const tracks = await this.prisma.track.findMany({
      where: { artistId: artist.id },
      include: {
        album: true,
        artist: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tracks;
  }

  async myAlbums(userId: string) {
    const artist = await this.ensureArtistProfile(userId);

    const albums = await this.prisma.album.findMany({
      where: { artistId: artist.id },
      orderBy: {
        releaseAt: 'desc',
      },
    });

    return albums;
  }

  /**
   * Update thông tin profile của nghệ sĩ
   * body: { name?, avatar?, bio?, mainGenre? }
   */
  async updateProfile(userId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const data: any = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
    }

    if (typeof body.avatar === 'string' && body.avatar.trim()) {
      data.avatar = body.avatar.trim();
    }

    if (body.bio !== undefined) {
      data.bio =
        typeof body.bio === 'string' && body.bio.trim()
          ? body.bio.trim()
          : null;
    }

    if (body.mainGenre !== undefined) {
      data.mainGenre = body.mainGenre || null;
    }

    if (!Object.keys(data).length) {
      return artist;
    }

    const updated = await this.prisma.artist.update({
      where: { id: artist.id },
      data,
    });

    return updated;
  }

  /**
   * Tạo track mới
   */
  async uploadTrack(userId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const { title, coverUrl, audioUrl, albumId } = body;

    if (!title || typeof title !== 'string') {
      throw new BadRequestException('title is required');
    }

    if (!coverUrl || typeof coverUrl !== 'string') {
      throw new BadRequestException('coverUrl is required');
    }

    if (!audioUrl || typeof audioUrl !== 'string') {
      throw new BadRequestException('audioUrl is required');
    }

    const duration =
      typeof body.duration === 'number' && body.duration >= 0
        ? body.duration
        : 0;

    const track = await this.prisma.track.create({
      data: {
        title,
        coverUrl,
        audioUrl,
        duration,
        artistId: artist.id,
        albumId: albumId || null,
        lyrics: body.lyrics ?? null,
        popularity: 0,
      },
    });

    return track;
  }

  /**
   * Cập nhật track (đổi album, title, lyrics, duration, cover…)
   */
  async updateTrack(userId: string, trackId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track || track.artistId !== artist.id) {
      throw new NotFoundException('Track not found');
    }

    const data: any = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      data.title = body.title.trim();
    }

    if (body.albumId !== undefined) {
      data.albumId = body.albumId || null;
    }

    if (typeof body.coverUrl === 'string' && body.coverUrl.trim()) {
      data.coverUrl = body.coverUrl.trim();
    }

    if (typeof body.duration === 'number' && body.duration >= 0) {
      data.duration = body.duration;
    }

    if (body.lyrics !== undefined) {
      data.lyrics =
        typeof body.lyrics === 'string' && body.lyrics.trim()
          ? body.lyrics.trim()
          : null;
    }

    if (!Object.keys(data).length) {
      return track;
    }

    return this.prisma.track.update({
      where: { id: trackId },
      data,
    });
  }

  /**
   * Xoá một track của chính nghệ sĩ
   */
  async deleteTrack(userId: string, trackId: string) {
    const artist = await this.ensureArtistProfile(userId);

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track || track.artistId !== artist.id) {
      throw new NotFoundException('Track not found');
    }

    await this.prisma.track.delete({
      where: { id: trackId },
    });

    return { success: true };
  }

  /**
   * Tạo album mới
   */
  async createAlbum(userId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const { title, coverUrl, releaseAt } = body;

    if (!title || typeof title !== 'string') {
      throw new BadRequestException('title is required');
    }

    let releaseDate: Date | undefined;
    if (releaseAt) {
      const d = new Date(releaseAt);
      if (!isNaN(d.getTime())) {
        releaseDate = d;
      }
    }

    const album = await this.prisma.album.create({
      data: {
        title: title.trim(),
        coverUrl: typeof coverUrl === 'string' ? coverUrl : null,
        artistId: artist.id,
        releaseAt: releaseDate,
      },
    });

    return album;
  }

  /**
   * Cập nhật album
   */
  async updateAlbum(userId: string, albumId: string, body: any) {
    const artist = await this.ensureArtistProfile(userId);

    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album || album.artistId !== artist.id) {
      throw new NotFoundException('Album not found');
    }

    const data: any = {};

    if (typeof body.title === 'string' && body.title.trim()) {
      data.title = body.title.trim();
    }

    if (typeof body.coverUrl === 'string' && body.coverUrl.trim()) {
      data.coverUrl = body.coverUrl.trim();
    }

    if (body.releaseAt !== undefined) {
      if (body.releaseAt) {
        const d = new Date(body.releaseAt);
        if (!isNaN(d.getTime())) data.releaseAt = d;
      } else {
        data.releaseAt = null;
      }
    }

    if (!Object.keys(data).length) {
      return album;
    }

    return this.prisma.album.update({
      where: { id: albumId },
      data,
    });
  }

  // ========== PUBLIC ROUTES (USER) ==========

  async listArtists() {
    const artists = await this.prisma.artist.findMany({
      include: {
        _count: {
          select: {
            tracks: true,
            albums: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return artists.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      bio: a.bio,
      mainGenre: a.mainGenre,
      tracksCount: a._count.tracks,
      albumsCount: a._count.albums,
    }));
  }

    async getArtistById(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        albums: {
          orderBy: { releaseAt: 'desc' },
        },
        tracks: {
          include: {
            artist: true,
            album: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    // Đếm số bài hát theo albumId
    const tracksByAlbumId: Record<string, number> = artist.tracks.reduce(
      (acc, t: any) => {
        if (t.albumId) {
          acc[t.albumId] = (acc[t.albumId] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      id: artist.id,
      userId: artist.userId, // để client biết ai là chủ
      name: artist.name,
      avatar: artist.avatar,
      bio: artist.bio,
      mainGenre: artist.mainGenre,
      tracksCount: artist.tracks.length,
      albums: artist.albums.map((al) => ({
        id: al.id,
        title: al.title,
        coverUrl: al.coverUrl,
        releaseAt: al.releaseAt,
        tracksCount: tracksByAlbumId[al.id] || 0, // ✅ ĐÃ FIX
      })),
      tracks: artist.tracks.map((t: any) => ({
        id: t.id,
        title: t.title,
        audioUrl: t.audioUrl,
        coverUrl: t.coverUrl,
        duration: t.duration,
        genre: t.genre ?? null,
        album: t.album
          ? { id: t.album.id, title: t.album.title }
          : null,
        artist: t.artist
          ? { id: t.artist.id, name: t.artist.name }
          : null,
      })),
    };
  }
async deleteAlbum(userId: string, albumId: string) {
  const artist = await this.ensureArtistProfile(userId);

  const album = await this.prisma.album.findUnique({
    where: { id: albumId },
  });

  if (!album || album.artistId !== artist.id) {
    throw new NotFoundException("Album not found");
  }

  // Bỏ albumId khỏi track → thành single
  await this.prisma.track.updateMany({
    where: { albumId: album.id, artistId: artist.id },
    data: { albumId: null },
  });

  // Xoá album
  await this.prisma.album.delete({
    where: { id: album.id },
  });

  return { success: true };
}
}
