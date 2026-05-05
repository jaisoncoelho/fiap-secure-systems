import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { UploadController } from './infrastructure/controllers/upload.controller';
import { UploadDiagramUseCase } from './application/use-cases/upload-diagram.use-case';
import { GetStatusUseCase } from './application/use-cases/get-status.use-case';
import { AnalysisOrmEntity } from './infrastructure/persistence/analysis.orm-entity';
import { AnalysisRepository } from './infrastructure/persistence/analysis.repository';
import { ANALYSIS_REPOSITORY } from './application/ports/analysis.repository.port';
import { FILE_STORAGE } from './application/ports/file-storage.port';
import { LocalFileStorage } from './infrastructure/storage/local-file-storage';
import { MESSAGE_PUBLISHER } from './application/ports/message.publisher.port';
import { RabbitMQPublisher } from './infrastructure/messaging/rabbitmq.publisher';
import { LifecycleConsumer } from './infrastructure/messaging/lifecycle.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST', 'postgres'),
        port: parseInt(config.get('POSTGRES_PORT', '5432'), 10),
        username: config.get('POSTGRES_USER', 'fiap'),
        password: config.get('POSTGRES_PASSWORD', 'fiap'),
        database: config.get('POSTGRES_DB', 'fiap_upload'),
        entities: [AnalysisOrmEntity],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([AnalysisOrmEntity]),
  ],
  controllers: [UploadController],
  providers: [
    UploadDiagramUseCase,
    GetStatusUseCase,
    LifecycleConsumer,
    { provide: ANALYSIS_REPOSITORY, useClass: AnalysisRepository },
    { provide: FILE_STORAGE, useClass: LocalFileStorage },
    { provide: MESSAGE_PUBLISHER, useClass: RabbitMQPublisher },
  ],
})
export class AppModule {}
