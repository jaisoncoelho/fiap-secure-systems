import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const port = parseInt(process.env.PROCESSING_SERVICE_PORT || '3002', 10);
  await app.listen(port);
}
bootstrap();
