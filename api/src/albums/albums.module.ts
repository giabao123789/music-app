// src/albums/albums.module.ts
import { Module } from "@nestjs/common";
import { AlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AlbumsController],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
