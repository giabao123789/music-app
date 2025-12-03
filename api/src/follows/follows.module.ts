// src/follows/follows.module.ts
import { Module } from "@nestjs/common";
import { FollowsService } from "./follows.service";
import { FollowsController } from "./follows.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [FollowsService],
  controllers: [FollowsController],
  exports: [FollowsService],
})
export class FollowsModule {}
