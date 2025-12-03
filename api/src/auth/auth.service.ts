// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from '../otp/otp.service';
import { OtpPurpose, Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  // ========================
  // LOGIN
  // ========================
  async login(user: User) {
    const artist = await this.prisma.artist.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      artistId: artist?.id ?? null,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    };
  }

  // ========================
  // REGISTER + OTP
  // ========================
  async registerVerify(dto: {
    email: string;
    code: string;
    password: string;
    name?: string;
    isArtist?: boolean;
  }) {
    const { email, code, password, name, isArtist } = dto;

    await this.otpService.validateAndUse({
      email,
      code,
      purpose: OtpPurpose.REGISTER,
    });

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        verified: true,
        role: isArtist ? Role.ARTIST : Role.USER,
      },
    });

    if (isArtist) {
      await this.prisma.artist.create({
        data: {
          name: name || email,
          userId: user.id,
        },
      });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, accessToken: token };
  }
}
