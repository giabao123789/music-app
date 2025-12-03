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

  async issueForEmail(email: string, purpose: OtpPurpose) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = addMinutes(new Date(), 10);

    await this.prisma.emailOtp.create({
      data: {
        email,
        code,
        purpose,
        expiresAt,
      },
    });

    // 👇 Gửi mail: to chính là email tham số truyền vào
    await this.mail.sendMail(
      email,
      'Mã xác nhận đăng ký',
      `Mã OTP của bạn là: ${code} (hết hạn sau 10 phút).`,
    );

    return code;
  }

  async validateAndUse(email: string, purpose: OtpPurpose, code: string) {
    const now = new Date();

    const otp = await this.prisma.emailOtp.findFirst({
      where: {
        email,
        code,
        purpose,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return null;

    // nếu bạn không cần usedAt nữa thì bỏ luôn phần update,
    // hoặc nếu schema có usedAt: DateTime? thì mới update
    return otp;
  }
}
