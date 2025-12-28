// api/src/auth/jwt-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const method = req.method;
    const url: string = req.originalUrl || req.url;

    // 1. Check @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // 2. Luôn BỎ QUA các route auth + @Public
    if (
      isPublic ||
      url.startsWith('/auth/login') ||
      url.startsWith('/auth/register') ||
      url.startsWith('/auth/register-start') ||
      url.startsWith('/auth/verify-otp')
    ) {
      console.log('🔥 JwtAuthGuard SKIP', method, url);
      return true;
    }

    // 3. TẠM THỜI: nếu không có token thì **KHÔNG** trả 401 nữa
    const header: string = req.headers['authorization'] || '';
    const [type, token] = header.split(' ');

    if (!token || type !== 'Bearer') {
      console.log('🔥 JwtAuthGuard NO TOKEN, TEMPORARY ALLOW', method, url);
      // Cho qua luôn, không ném Unauthorized nữa
      (req as any).user = null;
      return true;

      // Sau khi debug xong, bạn có thể đổi lại thành:
      // throw new UnauthorizedException('Missing Bearer token');
    }

    // 4. Verify token bình thường
    try {
      const payload = this.jwt.verify(token);
      (req as any).user = payload;
      return true;
    } catch (err) {
      console.log('🔥 JwtAuthGuard INVALID TOKEN', method, url, err?.message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
