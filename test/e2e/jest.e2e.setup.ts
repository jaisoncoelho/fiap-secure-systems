import 'reflect-metadata';

// Run before any AppModule imports so nestjs-pino's level is captured correctly.
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
