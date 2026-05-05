import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ANALYSIS_EXCHANGE,
  AnalysisRequestedEvent,
  ROUTING_KEYS,
} from '@app/shared';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, Options } from 'amqplib';
import { MessagePublisherPort } from '../../application/ports/message.publisher.port';

const PERSISTENT_JSON: Options.Publish = {
  persistent: true,
  contentType: 'application/json',
};

@Injectable()
export class RabbitMQPublisher
  implements MessagePublisherPort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection!: amqp.AmqpConnectionManager;
  private channel!: ChannelWrapper;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://fiap:fiap@rabbitmq:5672');
    this.connection = amqp.connect([url]);
    this.connection.on('connect', () => this.logger.log('RabbitMQ connected'));
    this.connection.on('disconnect', (err) =>
      this.logger.warn(`RabbitMQ disconnected: ${err?.err?.message}`),
    );
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

  async publishAnalysisRequested(event: AnalysisRequestedEvent): Promise<void> {
    await this.channel.publish(
      ANALYSIS_EXCHANGE,
      ROUTING_KEYS.ANALYSIS_REQUESTED,
      event,
      PERSISTENT_JSON,
    );
    this.logger.log(`Published analysis.requested for ${event.analysisId}`);
  }
}
