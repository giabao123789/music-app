// api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OtpModule } from '../otp/otp.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    OtpModule,

    // JWT dùng cho AuthController (login trả accessToken)
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret_dev_key_change_me',
      signOptions: { expiresIn: '7d' },
    }),
  ],

  controllers: [AuthController],

  // Hiện tại login/register đều xử lý trực tiếp trong AuthController,
  // không dùng AuthService hay JwtStrategy => không cần providers ở đây.
  providers: [],

  // Export JwtModule để module khác (nếu cần) vẫn dùng được JwtService
  exports: [JwtModule],
})
export class AuthModule {}
