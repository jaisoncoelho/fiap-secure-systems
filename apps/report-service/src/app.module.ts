import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { SaveReportUseCase } from './application/use-cases/save-report.use-case';
import { GetReportUseCase } from './application/use-cases/get-report.use-case';
import { REPORT_REPOSITORY } from './application/ports/report.repository.port';
import { ReportRepository } from './infrastructure/persistence/report.repository';
import { ReportOrmEntity } from './infrastructure/persistence/report.orm-entity';
import { AnalysisCompletedConsumer } from './infrastructure/messaging/consumer.controller';
import { ReportController } from './infrastructure/controllers/report.controller';

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
        database: config.get('POSTGRES_DB', 'fiap_report'),
        entities: [ReportOrmEntity],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([ReportOrmEntity]),
  ],
  controllers: [ReportController],
  providers: [
    SaveReportUseCase,
    GetReportUseCase,
    AnalysisCompletedConsumer,
    { provide: REPORT_REPOSITORY, useClass: ReportRepository },
  ],
})
export class AppModule {}
