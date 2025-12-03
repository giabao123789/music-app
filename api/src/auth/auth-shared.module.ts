// src/auth/auth-shared.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  exports: [JwtModule],
})
export class AuthSharedModule {}
