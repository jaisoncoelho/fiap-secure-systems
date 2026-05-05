import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AnalyzeDiagramUseCase } from './application/use-cases/analyze-diagram.use-case';
import { AI_ANALYZER } from './application/ports/ai-analyzer.port';
import { OpenAiAdapter } from './infrastructure/ai/openai.adapter';
import { PROCESSING_PUBLISHER } from './application/ports/message.publisher.port';
import { ProcessingRabbitMQPublisher } from './infrastructure/messaging/rabbitmq.publisher';
import { PROCESSING_REPOSITORY } from './application/ports/processing.repository.port';
import { ProcessingRepository } from './infrastructure/persistence/processing.repository';
import { ProcessingJobOrmEntity } from './infrastructure/persistence/processing-job.orm-entity';
import { AnalysisRequestedConsumer } from './infrastructure/messaging/consumer.controller';
import { HealthController } from './infrastructure/controllers/health.controller';

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
        database: config.get('POSTGRES_DB', 'fiap_processing'),
        entities: [ProcessingJobOrmEntity],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([ProcessingJobOrmEntity]),
  ],
  controllers: [HealthController],
  providers: [
    AnalyzeDiagramUseCase,
    AnalysisRequestedConsumer,
    { provide: AI_ANALYZER, useClass: OpenAiAdapter },
    { provide: PROCESSING_PUBLISHER, useClass: ProcessingRabbitMQPublisher },
    { provide: PROCESSING_REPOSITORY, useClass: ProcessingRepository },
  ],
})
export class AppModule {}
