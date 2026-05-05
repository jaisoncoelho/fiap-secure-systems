import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ANALYSIS_EXCHANGE, AnalysisCompletedEvent, ROUTING_KEYS } from '@app/shared';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { SaveReportUseCase } from '../../application/use-cases/save-report.use-case';

const QUEUE_NAME = 'analysis.completed.report.queue';

@Injectable()
export class AnalysisCompletedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalysisCompletedConsumer.name);
  private connection!: amqp.AmqpConnectionManager;
  private channel!: ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    private readonly useCase: SaveReportUseCase,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://fiap:fiap@rabbitmq:5672');
    this.connection = amqp.connect([url]);
    this.connection.on('error', (err) =>
      this.logger.warn(`amqp connection error: ${err.message}`),
    );
    this.channel = this.connection.createChannel({
      json: false,
      setup: async (ch: ConfirmChannel) => {
        ch.on('error', (err) => this.logger.warn(`amqp channel error: ${err.message}`));
        await ch.assertExchange(ANALYSIS_EXCHANGE, 'topic', { durable: true });
        await ch.assertQueue(QUEUE_NAME, { durable: true });
        await ch.bindQueue(QUEUE_NAME, ANALYSIS_EXCHANGE, ROUTING_KEYS.ANALYSIS_COMPLETED);
        await ch.prefetch(1);
        await ch.consume(QUEUE_NAME, (msg) => {
          if (msg) void this.handle(ch, msg);
        });
      },
    });
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
    } catch {
      // ignore
    }
    try {
      await this.connection?.close();
    } catch {
      // ignore
    }
  }

  private async handle(ch: ConfirmChannel, msg: ConsumeMessage) {
    let event: AnalysisCompletedEvent | undefined;
    try {
      event = JSON.parse(msg.content.toString());
      await this.useCase.execute(event!);
      ch.ack(msg);
    } catch (err) {
      this.logger.error(
        `failed to save report for ${event?.analysisId}: ${(err as Error).message}`,
      );
      ch.nack(msg, false, false);
    }
  }
}
