import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UpdatePlaylistMetaDto = {
  name?: string;
};

type ReorderItem = {
  trackId: string;
  order: number;
};

@Injectable()
export class PlaylistsService {
  constructor(private prisma: PrismaService) {}

  // ========== CRUD CƠ BẢN ==========

  // Tạo playlist cho 1 user
  create(userId: string, name: string) {
    return this.prisma.playlist.create({
      data: {
        userId,
        name,
      },
    });
  }

  // Danh sách playlist của user
  findByUser(userId: string) {
    return this.prisma.playlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Chi tiết playlist + items (PlaylistTrack + Track)
  async findOneWithTracks(id: string) {
    const pl = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: {
            track: {
              include: { artist: true },
            },
          },
        },
      },
    });

    return pl;
  }

  // Đổi tên playlist
  async updateMeta(id: string, dto: UpdatePlaylistMetaDto) {
    const data: any = {};

    if (typeof dto.name === 'string' && dto.name.trim().length > 0) {
      data.name = dto.name.trim();
    }

    if (Object.keys(data).length === 0) {
      // không có gì để update -> trả lại hiện trạng
      return this.prisma.playlist.findUnique({ where: { id } });
    }

    return this.prisma.playlist.update({
      where: { id },
      data,
    });
  }

  // ========== THÊM / XOÁ TRACK ==========

  // Thêm 1 bài vào playlist (chống trùng)
  async addTrack(playlistId: string, trackId: string) {
    // Nếu đã có thì trả luôn, không tạo mới
    const exists = await this.prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId },
      },
    });

    if (exists) {
      return exists;
    }

    // Lấy order cuối để append
    const last = await this.prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = last ? last.order + 1 : 0;

    return this.prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        order: nextOrder,
      },
    });
  }

  // Xoá 1 bài khỏi playlist
  async removeTrack(playlistId: string, trackId: string) {
    // Tìm đúng bản ghi PlaylistTrack theo unique (playlistId, trackId)
    const item = await this.prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId },
      },
    });

    if (!item) {
      throw new NotFoundException('Track không nằm trong playlist');
    }

    await this.prisma.playlistTrack.delete({
      where: { id: item.id },
    });

    return { ok: true };
  }

  // Sắp xếp lại thứ tự bài hát
  async reorderTracks(playlistId: string, items: ReorderItem[]) {
    if (!items || items.length === 0) return { ok: true };

    const ops = items.map((it) =>
      this.prisma.playlistTrack.update({
        where: {
          playlistId_trackId: {
            playlistId,
            trackId: it.trackId,
          },
        },
        data: { order: it.order },
      }),
    );

    await this.prisma.$transaction(ops);

    return { ok: true };
  }

  // ========== XOÁ PLAYLIST ==========

  async deletePlaylist(id: string) {
    // Xoá hết các dòng PlaylistTrack trước
    await this.prisma.playlistTrack.deleteMany({
      where: { playlistId: id },
    });

    // Sau đó xoá playlist
    await this.prisma.playlist.delete({
      where: { id },
    });

    return { ok: true };
  }

  // ========== PLAYLIST HỆ THỐNG / HOMEPAGE ==========

  // Dùng lại 1 helper map track -> shape frontend dùng
  private mapTrack(t: any) {
    return {
      id: t.id,
      title: t.title,
      audioUrl: t.audioUrl,
      coverUrl: t.coverUrl,
      duration: t.duration,
      genre: t.genre,
      artist: t.artist ? { id: t.artist.id, name: t.artist.name } : null,
    };
  }

  // Playlist cho trang chủ (home)
  async getHomePlaylists() {
    // Top theo popularity
    const top = await this.prisma.track.findMany({
      orderBy: { popularity: 'desc' },
      take: 30,
      include: { artist: true },
    });

    const ballad = await this.prisma.track.findMany({
      where: { genre: 'BALLAD' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { artist: true },
    });

    const rap = await this.prisma.track.findMany({
      where: { genre: 'RAP' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { artist: true },
    });

    const indie = await this.prisma.track.findMany({
      where: { genre: 'INDIE' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { artist: true },
    });

    const random = await this.prisma.track.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { artist: true },
    });

    return [
      {
        id: 'top-hits-vn',
        name: 'Top Hits Việt Nam',
        tracks: top.map((t) => this.mapTrack(t)),
      },
      {
        id: 'ballad-viet-buon',
        name: 'Ballad Việt Buồn',
        tracks: ballad.map((t) => this.mapTrack(t)),
      },
      {
        id: 'rap-viet-bat-lua',
        name: 'Rap Việt Bật Lửa',
        tracks: rap.map((t) => this.mapTrack(t)),
      },
      {
        id: 'indie-viet-dem-khuya',
        name: 'Indie Việt Đêm Khuya',
        tracks: indie.map((t) => this.mapTrack(t)),
      },
      {
        id: 'goi-y-cho-ban',
        name: 'Gợi ý cho bạn',
        tracks: random.slice(0, 20).map((t) => this.mapTrack(t)),
      },
      {
        id: 'co-the-ban-thich',
        name: 'Có thể bạn thích',
        tracks: random.slice(20).map((t) => this.mapTrack(t)),
      },
    ];
  }

  // Playlist system – có thể dùng chung với home
  async getSystemPlaylists() {
    return this.getHomePlaylists();
  }
}
