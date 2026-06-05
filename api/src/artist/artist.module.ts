// api/src/artist/artist.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { ArtistService } from './artist.service';

// Controller quản lý nghệ sĩ (cũ, dùng cho /artist/...)
import { ArtistController, PublicArtistsController } from './artist.controller';

// Controller public cũ của bạn (nếu có các route khác, vẫn giữ)
import { ArtistPublicController } from './artist-public.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    ArtistController,         // /artist/...
    ArtistPublicController,   // controller public cũ của bạn
    PublicArtistsController,  // /artists và /artists/:id (mới thêm)
  ],
  providers: [ArtistService],
  exports: [ArtistService],
})
export class ArtistModule {}
