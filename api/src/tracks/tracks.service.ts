import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TracksService {
  findAll() {
    return prisma.track.findMany({
      include: { artist: true },
    });
  }
}
