import axios from 'axios';
import FormData from 'form-data';
import { E2EStack, startStack } from './setup-stack';

describe('stack boot — gateway + upload-service + report-service over real Postgres/RabbitMQ', () => {
  let stack: E2EStack;

  beforeAll(async () => {
    stack = await startStack();
  }, 180000);

  afterAll(async () => {
    if (stack) await stack.teardown();
  }, 60000);

  it('rejects calls without an api key', async () => {
    const res = await axios.get(
      `${stack.gatewayUrl}/api/v1/status/00000000-0000-0000-0000-000000000000`,
      { validateStatus: () => true },
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown analysis id (proxied to upload-service + Postgres)', async () => {
    const res = await axios.get(
      `${stack.gatewayUrl}/api/v1/status/11111111-1111-1111-1111-111111111111`,
      { headers: { 'x-api-key': stack.apiKey }, validateStatus: () => true },
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await axios.get(`${stack.gatewayUrl}/api/v1/status/not-a-uuid`, {
      headers: { 'x-api-key': stack.apiKey },
      validateStatus: () => true,
    });
    expect(res.status).toBe(400);
  });

  it('rejects unsupported mime types on upload', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('not an image'), {
      filename: 'note.txt',
      contentType: 'text/plain',
    });
    const res = await axios.post(`${stack.gatewayUrl}/api/v1/upload`, form, {
      headers: { ...form.getHeaders(), 'x-api-key': stack.apiKey },
      validateStatus: () => true,
    });
    expect(res.status).toBe(400);
  });

  it('rejects upload without a file field', async () => {
    const form = new FormData();
    const res = await axios.post(`${stack.gatewayUrl}/api/v1/upload`, form, {
      headers: { ...form.getHeaders(), 'x-api-key': stack.apiKey },
      validateStatus: () => true,
    });
    expect(res.status).toBe(400);
  });
});
