// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS cho frontend Next.js
  app.enableCors({
    origin: 'http://localhost:3000', // URL frontend
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  });

  // Serve file tĩnh: audio, ảnh upload
  // => http://localhost:3001/uploads/...
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.useLogger(['error', 'warn', 'debug', 'verbose', 'log']);

  await app.listen(process.env.PORT || 3001);
  console.log(
    `🚀 API running at http://localhost:${process.env.PORT || 3001}`,
  );
}
bootstrap();
