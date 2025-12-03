// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ✅ Biến PrismaModule thành global module
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // ✅ Export để module khác dùng được
})
export class PrismaModule {}
