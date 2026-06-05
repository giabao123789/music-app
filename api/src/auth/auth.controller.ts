// api/src/auth/auth.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { Public } from './public.decorator';

class RegisterStartDto {
  email: string;
  password: string;
  role: Role; // 'USER' | 'ARTIST' | 'ADMIN'
  displayName?: string;
}

class VerifyOtpDto {
  email: string;
  code: string;
  password: string;
  role: Role;
  displayName?: string;
}

class LoginDto {
  email: string;
  password: string;
}

class ForgotPasswordDto {
  email: string;
}

class ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

  // ===== B1: Gửi OTP để đăng ký =====
  @Public()
  @Post('register-start')
  async registerStart(@Body() dto: RegisterStartDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email không hợp lệ');
    if (!dto.password || dto.password.length < 4) {
      throw new BadRequestException('Mật khẩu tối thiểu 4 ký tự');
    }

    // ✅ Patch: Nếu tài khoản đã tồn tại (đã verified) → báo "Tài khoản đã tồn tại"
    // (giữ nguyên các chức năng khác, chỉ thêm check này)
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing?.verified) {
      throw new ConflictException('Tài khoản đã tồn tại');
    }

    await this.otp.issueForEmail(email, OtpPurpose.REGISTER);

    return { ok: true, message: 'OTP đã được gửi nếu email hợp lệ' };
  }

  // ===== B2: Xác nhận OTP + tạo/cập nhật user =====
  @Public()
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email không hợp lệ');
    if (!dto.code) throw new BadRequestException('Thiếu mã OTP');
    if (!dto.password) throw new BadRequestException('Thiếu mật khẩu');

    const otp = await this.otp.validateAndUse(
      email,
      OtpPurpose.REGISTER,
      dto.code,
    );

    if (!otp) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    let user = await this.prisma.user.findUnique({ where: { email } });
    const now = new Date();

    // ✅ Patch: Nếu user đã tồn tại và đã verified → không cho "đăng ký lại" ghi đè password/role
    if (user?.verified) {
      throw new ConflictException('Tài khoản đã tồn tại');
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: dto.displayName || email.split('@')[0],
          password: hashed,
          role: dto.role || Role.USER,
          verified: true,
          createdAt: now,
        },
      });
    } else {
      // trường hợp user tồn tại nhưng chưa verified → cho phép set verified + cập nhật password
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          role: dto.role || user.role,
          verified: true,
        },
      });
    }

    if (user.role === Role.ARTIST) {
      await this.prisma.artist.upsert({
        where: { userId: user.id },
        update: {
          name: user.name || user.email.split('@')[0],
        },
        create: {
          name: user.name || user.email.split('@')[0],
          userId: user.id,
        },
      });
    }

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verified: user.verified,
      },
    };
  }

  // ===== LOGIN =====
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) {
      throw new BadRequestException('Thiếu email hoặc mật khẩu');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // ✅ Patch: phân biệt rõ "tài khoản không tồn tại"
    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }

    let isMatch = false;

    if (
      user.password.startsWith('$2a$') ||
      user.password.startsWith('$2b$') ||
      user.password.startsWith('$2y$')
    ) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      if (password === user.password) {
        isMatch = true;
        const newHash = await bcrypt.hash(password, 10);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: newHash },
        });
      }
    }

    // ✅ Patch: phân biệt rõ "sai mật khẩu"
    if (!isMatch) {
      throw new BadRequestException('Sai mật khẩu');
    }

    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      ok: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verified: user.verified,
      },
    };
  }
}
