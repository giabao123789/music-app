import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Request } from 'express';

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
  constructor(private reflector: Reflector) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret_dev_key_change_me',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      req.route?.stack?.[0]?.handle,
      req.route,
    ]);

    if (isPublic) {
      return {
        id: null,
        email: null,
        role: null,
        raw: payload,
      };
    }

    const userId = payload.sub || payload.userId || payload.id;

    return {
      id: userId || null,
      email: payload.email || null,
      role: payload.role || null,
      raw: payload,
    };
  }
}

export { JwtStrategy }; // ✅ THÊM EXPORT để fix lỗi import
