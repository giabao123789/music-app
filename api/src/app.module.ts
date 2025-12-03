// src/app.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TracksModule } from './tracks/tracks.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AuthModule } from './auth/auth.module';
import { OtpModule } from './otp/otp.module';
import { MailModule } from './mail/mail.module';
import { ArtistModule } from './artist/artist.module';
import { AdminModule } from './admin/admin.module';
import { AlbumsModule } from "./albums/albums.module";
import { FollowsModule } from "./follows/follows.module";
import { CommentsModule } from "./comments/comments.module";
@Module({
  imports: [
     AlbumsModule,
    PrismaModule,
    MailModule,
    OtpModule,
    AuthModule,
    TracksModule,
    PlaylistsModule,
    FavoritesModule,
    ArtistModule,
    AdminModule,
    FollowsModule,
    CommentsModule,
  ],
})
export class AppModule {}
