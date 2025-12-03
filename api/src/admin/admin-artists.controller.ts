import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/artists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminArtistsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll() {
    // Không filter gì cả -> trả ra TẤT CẢ artist trong DB
    return this.prisma.artist.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        avatar: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            verified: true,
          },
        },
        tracks: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            verified: true,
          },
        },
        tracks: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });
  }

  @Patch(':id')
  async updateArtist(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      avatar?: string;
      userId?: string | null;
    },
  ) {
    return this.prisma.artist.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.avatar !== undefined && { avatar: body.avatar }),
        ...(body.userId !== undefined && { userId: body.userId }),
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        userId: true,
      },
    });
  }

  @Delete(':id')
  async deleteArtist(@Param('id') id: string) {
    return this.prisma.artist.delete({
      where: { id },
    });
  }
}
