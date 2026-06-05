// api/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ArtistModule } from '../artist/artist.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,   // ✅ để JwtService tồn tại cho JwtAuthGuard
    ArtistModule, // ✅ vì NotificationsController inject ArtistService (ArtistModule đã exports ArtistService)
  ],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
