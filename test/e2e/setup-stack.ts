import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Client } from 'pg';

import { AppModule as ApiGatewayModule } from '../../apps/api-gateway/src/app.module';
import { AppModule as UploadModule } from '../../apps/upload-service/src/app.module';
import { AppModule as ProcessingModule } from '../../apps/processing-service/src/app.module';
import { AppModule as ReportModule } from '../../apps/report-service/src/app.module';

export interface E2EStack {
  gatewayUrl: string;
  uploadDir: string;
  apiKey: string;
  teardown: () => Promise<void>;
}

const GATEWAY_PORT = 13000;
const UPLOAD_PORT = 13001;
const PROCESSING_PORT = 13002;
const REPORT_PORT = 13003;

const API_KEY = 'e2e-test-key';

async function createDatabases(pg: StartedPostgreSqlContainer): Promise<void> {
  const client = new Client({
    host: pg.getHost(),
    port: pg.getPort(),
    user: pg.getUsername(),
    password: pg.getPassword(),
    database: pg.getDatabase(),
  });
  await client.connect();
  for (const db of ['fiap_upload', 'fiap_processing', 'fiap_report']) {
    await client.query(`CREATE DATABASE ${db}`);
  }
  await client.end();
}

async function bootService(
  module: any,
  opts: { httpPort: number },
  _rabbitUrl: string,
): Promise<INestApplication> {
  const app = await NestFactory.create(module, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(opts.httpPort);
  return app;
}

export async function startStack(): Promise<E2EStack> {
  const pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withUsername('fiap')
    .withPassword('fiap')
    .withDatabase('postgres')
    .start();
  await createDatabases(pg);

  const rmq = await new RabbitMQContainer('rabbitmq:3.13-management-alpine').start();
  const rabbitUrl = rmq.getAmqpUrl();

  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fiap-e2e-uploads-'));

  // Shared env (RabbitMQ, Postgres host/credentials, OpenAI, storage)
  process.env.RABBITMQ_URL = rabbitUrl;
  process.env.POSTGRES_HOST = pg.getHost();
  process.env.POSTGRES_PORT = String(pg.getPort());
  process.env.POSTGRES_USER = pg.getUsername();
  process.env.POSTGRES_PASSWORD = pg.getPassword();
  process.env.UPLOAD_DIR = uploadDir;
  process.env.API_KEY = API_KEY;
  process.env.UPLOAD_SERVICE_URL = `http://localhost:${UPLOAD_PORT}`;
  process.env.REPORT_SERVICE_URL = `http://localhost:${REPORT_PORT}`;
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
  process.env.OPENAI_TIMEOUT_MS = '120000';
  process.env.OPENAI_MAX_RETRIES = '1';
  process.env.OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';
  process.env.LOG_LEVEL = 'error';
  process.env.NODE_ENV = 'test';

  // Each AppModule reads POSTGRES_DB at init — set before each create
  process.env.POSTGRES_DB = 'fiap_upload';
  const upload = await bootService(UploadModule, { httpPort: UPLOAD_PORT }, rabbitUrl);

  process.env.POSTGRES_DB = 'fiap_processing';
  const processing = await bootService(ProcessingModule, { httpPort: PROCESSING_PORT }, rabbitUrl);

  process.env.POSTGRES_DB = 'fiap_report';
  const report = await bootService(ReportModule, { httpPort: REPORT_PORT }, rabbitUrl);

  const gateway = await bootService(ApiGatewayModule, { httpPort: GATEWAY_PORT }, rabbitUrl);

  const teardown = async () => {
    await gateway.close().catch(() => undefined);
    await report.close().catch(() => undefined);
    await processing.close().catch(() => undefined);
    await upload.close().catch(() => undefined);
    await rmq.stop().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    await fs.rm(uploadDir, { recursive: true, force: true }).catch(() => undefined);
  };

  return {
    gatewayUrl: `http://localhost:${GATEWAY_PORT}`,
    uploadDir,
    apiKey: API_KEY,
    teardown,
  };
}
