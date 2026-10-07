import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getCorsOrigins } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Railway terminates traffic at its proxy; trust one hop so req.ip is the
  // visitor's address (sign-in rate limits are per IP) rather than the proxy's.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    // Every authenticated call is cross-origin with an Authorization header, so
    // the browser sends an OPTIONS preflight first. Let it reuse the answer
    // instead of paying an extra round trip per request (Chrome caps this at 2h).
    maxAge: 86400,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`HMS API running on http://localhost:${port}/api/v1`);
}

bootstrap();
