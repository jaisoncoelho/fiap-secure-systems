import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ANALYSIS_EXCHANGE,
  AnalysisCompletedEvent,
  AnalysisFailedEvent,
  AnalysisStartedEvent,
  ROUTING_KEYS,
} from '@app/shared';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, Options } from 'amqplib';
import { ProcessingPublisherPort } from '../../application/ports/message.publisher.port';

const PERSISTENT_JSON: Options.Publish = {
  persistent: true,
  contentType: 'application/json',
};

@Injectable()
export class ProcessingRabbitMQPublisher
  implements ProcessingPublisherPort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ProcessingRabbitMQPublisher.name);
  private connection!: amqp.AmqpConnectionManager;
  private channel!: ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://fiap:fiap@rabbitmq:5672');
    this.connection = amqp.connect([url]);
    this.connection.on('error', (err) =>
      this.logger.warn(`amqp connection error: ${err.message}`),
    );
    this.channel = this.connection.createChannel({
      json: true,
      setup: (ch: ConfirmChannel) => {
        ch.on('error', (err) => this.logger.warn(`amqp channel error: ${err.message}`));
        return ch.assertExchange(ANALYSIS_EXCHANGE, 'topic', { durable: true });
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

  async publishStarted(event: AnalysisStartedEvent): Promise<void> {
    await this.channel.publish(
      ANALYSIS_EXCHANGE,
      ROUTING_KEYS.ANALYSIS_STARTED,
      event,
      PERSISTENT_JSON,
    );
    this.logger.log(`Published analysis.started for ${event.analysisId}`);
  }

  async publishCompleted(event: AnalysisCompletedEvent): Promise<void> {
    await this.channel.publish(
      ANALYSIS_EXCHANGE,
      ROUTING_KEYS.ANALYSIS_COMPLETED,
      event,
      PERSISTENT_JSON,
    );
    this.logger.log(`Published analysis.completed for ${event.analysisId}`);
  }

  async publishFailed(event: AnalysisFailedEvent): Promise<void> {
    await this.channel.publish(
      ANALYSIS_EXCHANGE,
      ROUTING_KEYS.ANALYSIS_FAILED,
      event,
      PERSISTENT_JSON,
    );
    this.logger.log(`Published analysis.failed for ${event.analysisId}`);
  }
}
