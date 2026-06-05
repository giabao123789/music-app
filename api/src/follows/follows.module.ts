// src/follows/follows.module.ts
import { Module } from "@nestjs/common";
import { FollowsService } from "./follows.service";
import { FollowsController, ArtistsFollowingController } from "./follows.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [FollowsService],
  controllers: [FollowsController, ArtistsFollowingController],
  exports: [FollowsService],
})
export class FollowsModule {}
