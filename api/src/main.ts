// api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // ✅ giữ nguyên: chỉ thêm type NestExpressApplication để dùng static assets chắc chắn
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  });

  // ✅ GIỮ NGUYÊN: Serve file tĩnh upload (audio, images...)
  // => http://localhost:3001/uploads/...
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res) => {
      // giúp audio load/seek ổn định
      res.setHeader('Accept-Ranges', 'bytes');
    },
  });

  
  // ✅ Chỉ serve /music nếu thư mục tồn tại (tránh crash trên Render)
  const musicPath = join(process.cwd(), '..', 'web', 'public', 'music');
  const { existsSync } = await import('fs');
  if (existsSync(musicPath)) {
    app.useStaticAssets(musicPath, {
      prefix: '/music',
      setHeaders: (res) => {
        res.setHeader('Accept-Ranges', 'bytes');
      },
    });
  }

  app.useLogger(['error', 'warn', 'debug', 'verbose', 'log']);

  await app.listen(process.env.PORT || 3001);
  console.log(
    `API running at http://localhost:${process.env.PORT || 3001}`,
  );
}
bootstrap();
console.log('DATABASE_URL =', process.env.DATABASE_URL);
