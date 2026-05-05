import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ANALYSIS_EXCHANGE,
  AnalysisCompletedEvent,
  AnalysisFailedEvent,
  AnalysisStartedEvent,
  AnalysisStatus,
  ROUTING_KEYS,
} from '@app/shared';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import {
  ANALYSIS_REPOSITORY,
  AnalysisRepositoryPort,
} from '../../application/ports/analysis.repository.port';

const QUEUE_NAME = 'analysis.lifecycle.upload.queue';

@Injectable()
export class LifecycleConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LifecycleConsumer.name);
  private connection!: amqp.AmqpConnectionManager;
  private channel!: ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    @Inject(ANALYSIS_REPOSITORY)
    private readonly repo: AnalysisRepositoryPort,
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
        await ch.bindQueue(QUEUE_NAME, ANALYSIS_EXCHANGE, ROUTING_KEYS.ANALYSIS_STARTED);
        await ch.bindQueue(QUEUE_NAME, ANALYSIS_EXCHANGE, ROUTING_KEYS.ANALYSIS_COMPLETED);
        await ch.bindQueue(QUEUE_NAME, ANALYSIS_EXCHANGE, ROUTING_KEYS.ANALYSIS_FAILED);
        await ch.prefetch(1);
        await ch.consume(QUEUE_NAME, (msg) => {
          if (msg) void this.dispatch(ch, msg);
        });
      },
    });
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
    } catch {
      // ignore: channel may already be closed by broker shutdown
    }
    try {
      await this.connection?.close();
    } catch {
      // ignore
    }
  }

  private async dispatch(ch: ConfirmChannel, msg: ConsumeMessage) {
    const routingKey = msg.fields.routingKey;
    try {
      const payload = JSON.parse(msg.content.toString());
      switch (routingKey) {
        case ROUTING_KEYS.ANALYSIS_STARTED: {
          const ev = payload as AnalysisStartedEvent;
          await this.repo.updateStatus(ev.analysisId, AnalysisStatus.EM_PROCESSAMENTO);
          this.logger.log(`Analysis ${ev.analysisId} → EM_PROCESSAMENTO`);
          break;
        }
        case ROUTING_KEYS.ANALYSIS_COMPLETED: {
          const ev = payload as AnalysisCompletedEvent;
          await this.repo.updateStatus(ev.analysisId, AnalysisStatus.ANALISADO);
          this.logger.log(`Analysis ${ev.analysisId} → ANALISADO`);
          break;
        }
        case ROUTING_KEYS.ANALYSIS_FAILED: {
          const ev = payload as AnalysisFailedEvent;
          await this.repo.markFailed(ev.analysisId, ev.reason);
          this.logger.warn(`Analysis ${ev.analysisId} → ERRO (${ev.reason})`);
          break;
        }
        default:
          this.logger.warn(`unexpected routing key: ${routingKey}`);
      }
      ch.ack(msg);
    } catch (err) {
      this.logger.error(
        `lifecycle dispatch failed for ${routingKey}: ${(err as Error).message}`,
      );
      ch.nack(msg, false, false);
    }
  }
}
