// api/src/admin/admin.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // JwtAuthGuard đã verify token và gắn user vào req
    const user = req.user;

    if (!user) {
      // Không có user => chưa đăng nhập
      throw new UnauthorizedException('Missing authenticated user');
    }

    if (user.role !== 'ADMIN') {
      // Đăng nhập nhưng không phải admin
      throw new ForbiddenException('Admin only');
    }

    return true;
  }
}
