import {
  Body,
  Controller,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import * as bcrypt from 'bcrypt';
import { Role, OtpPurpose } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

class RegisterStartDto {
  email: string;
  password: string;
  role: Role;        // 'USER' | 'ARTIST' | 'ADMIN'
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

@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private otp: OtpService,
    private jwt: JwtService,
  ) {}

  // B1: gửi OTP về email
  @Post('register-start')
  async registerStart(@Body() dto: RegisterStartDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email không hợp lệ');
    }
    if (!dto.password || dto.password.length < 4) {
      throw new BadRequestException('Mật khẩu tối thiểu 4 ký tự');
    }

    // gửi OTP cho email với purpose REGISTER
    await this.otp.issueForEmail(email, OtpPurpose.REGISTER);

    return { ok: true, message: 'OTP đã được gửi nếu email hợp lệ' };
  }

  // B2: verify OTP + tạo user (+ artist nếu role = ARTIST)
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email không hợp lệ');
    }
    if (!dto.code) {
      throw new BadRequestException('Thiếu mã OTP');
    }
    if (!dto.password) {
      throw new BadRequestException('Thiếu mật khẩu');
    }

    // 👉 ĐÚNG THỨ TỰ: (email, PURPOSE, code)
    const otp = await this.otp.validateAndUse(
      email,
      OtpPurpose.REGISTER,
      dto.code,
    );

    if (!otp) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    // hash password
    const hashed = await bcrypt.hash(dto.password, 10);

    // tìm user theo email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    const now = new Date();

    if (!user) {
      // tạo mới user
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
      // cập nhật user đã verify
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          role: dto.role || user.role,
          verified: true,
        },
      });
    }

    // ⭐ Nếu user là ARTIST thì đảm bảo có record trong bảng Artist
    if (user.role === Role.ARTIST) {
      await this.prisma.artist.upsert({
        where: { userId: user.id }, // userId là @unique trong schema
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

  // 👉 LOGIN: dùng cho trang /login
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

  // Nếu password trong DB là hash bcrypt
  if (
    user.password.startsWith('$2a$') ||
    user.password.startsWith('$2b$') ||
    user.password.startsWith('$2y$')
  ) {
    isMatch = await bcrypt.compare(password, user.password);
  } else {
    // Password đang lưu dạng plaintext (dữ liệu cũ)
    if (password === user.password) {
      isMatch = true;

      // Nâng cấp: hash lại mật khẩu và lưu vào DB
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
}
