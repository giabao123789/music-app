// api/src/otp/otp.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OtpPurpose } from '@prisma/client';
import { addMinutes } from 'date-fns';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private buildMail(purpose: OtpPurpose, code: string) {
    if (purpose === OtpPurpose.RESET_PASSWORD) {
      return {
        subject: 'Mã đặt lại mật khẩu',
        text: `Mã OTP đặt lại mật khẩu của bạn là: ${code} (hết hạn sau 10 phút).`,
      };
    }

    if (purpose === OtpPurpose.LOGIN) {
      return {
        subject: 'Mã đăng nhập',
        text: `Mã OTP đăng nhập của bạn là: ${code} (hết hạn sau 10 phút).`,
      };
    }

    // REGISTER (default)
    return {
      subject: 'Mã xác nhận đăng ký',
      text: `Mã OTP của bạn là: ${code} (hết hạn sau 10 phút).`,
    };
  }

  async issueForEmail(email: string, purpose: OtpPurpose) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = addMinutes(new Date(), 10);

    await this.prisma.emailOtp.create({
      data: {
        email: cleanEmail,
        code,
        purpose,
        expiresAt,
      },
    });

    const mail = this.buildMail(purpose, code);

    await this.mail.sendMail(cleanEmail, mail.subject, mail.text);

    return code;
  }

  async validateAndUse(email: string, purpose: OtpPurpose, code: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const now = new Date();

    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        email: cleanEmail,
        code,
        purpose,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return null;

    // ✅ one-time use: xoá OTP sau khi dùng
    await this.prisma.emailOtp.delete({ where: { id: otp.id } }).catch(() => null);

    return otp;
  }
}
