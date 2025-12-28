// api/src/auth/auth.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Post,
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

    if (!user) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng');
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

    if (!isMatch) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng');
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

  // =========================
  // FORGOT PASSWORD
  // =========================
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email không hợp lệ');

    // ✅ Không leak user tồn tại hay không: luôn trả ok
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      // gửi OTP purpose RESET_PASSWORD
      await this.otp.issueForEmail(email, OtpPurpose.RESET_PASSWORD);
    }

    return {
      ok: true,
      message: 'Nếu email tồn tại trong hệ thống, OTP sẽ được gửi.',
    };
  }

  // =========================
  // RESET PASSWORD
  // =========================
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const email = dto.email?.trim().toLowerCase();
    const code = dto.code?.trim();
    const newPassword = dto.newPassword;

    if (!email) throw new BadRequestException('Email không hợp lệ');
    if (!code) throw new BadRequestException('Thiếu mã OTP');
    if (!newPassword || newPassword.length < 4) {
      throw new BadRequestException('Mật khẩu tối thiểu 4 ký tự');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // vẫn báo chung chung
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    const ok = await this.otp.validateAndUse(
      email,
      OtpPurpose.RESET_PASSWORD,
      code,
    );

    if (!ok) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    return { ok: true, message: 'Đặt lại mật khẩu thành công' };
  }
}
  