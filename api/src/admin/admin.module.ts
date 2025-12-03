// src/admin/admin.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminArtistsController } from './admin-artists.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    
    // ⭐ Quan trọng: Admin dùng JwtAuthGuard → phải có AuthModule
    forwardRef(() => AuthModule),
  ],
  controllers: [AdminUsersController, AdminArtistsController],
})
export class AdminModule {}
