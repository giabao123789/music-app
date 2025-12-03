// api/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub?: string;
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
  [key: string]: any;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret_dev_key_change_me',
    });
  }

  async validate(payload: JwtPayload) {
    // ✔ cố gắng lấy userId từ nhiều field khác nhau
    const userId = payload.sub || payload.userId || payload.id;

    return {
      id: userId || null,
      email: payload.email || null,
      role: payload.role || null,
      // có thể giữ raw để debug nếu cần
      raw: payload,
    };
  }
}
