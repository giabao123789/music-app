import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor() {
    // Địa chỉ FROM (hiện thị trong mail)
    this.from =
      process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Gửi mail đơn giản
   */
  async sendMail(to: string, subject: string, text: string) {
    // Log ra để chắc chắn "to" có giá trị
    this.logger.log(`[MailService] sendMail() to="${to}"`);

    if (!to || !to.trim()) {
      this.logger.error(
        `[MailService] sendMail() bị gọi với 'to' rỗng: "${to}"`,
      );
      throw new Error('Recipient email (to) is empty');
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: to.trim(), // đảm bảo không có khoảng trắng
        subject,
        text,
      });

      this.logger.log(
        `[MailService] Mail sent OK to ${to.trim()} id=${info.messageId}`,
      );
      return info;
    } catch (err) {
      this.logger.error(
        `[MailService] Send mail error to ${to}: ${(err as any).message}`,
        err as any,
      );
      throw err;
    }
  }
}
