import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';
import { AnalysisStatus } from '@app/shared';
import { E2EStack, startStack } from './setup-stack';

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;

async function makeDiagramPng(): Promise<Buffer> {
  // Three coloured rectangles as a synthetic "diagram". Real enough to give
  // the LLM something to describe; deterministic enough for CI.
  const w = 800;
  const h = 400;
  const bg = await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).png().toBuffer();
  const blueBox = await sharp({
    create: { width: 180, height: 90, channels: 3, background: { r: 70, g: 130, b: 200 } },
  }).png().toBuffer();
  const greenBox = await sharp({
    create: { width: 180, height: 90, channels: 3, background: { r: 80, g: 170, b: 120 } },
  }).png().toBuffer();
  const orangeBox = await sharp({
    create: { width: 180, height: 90, channels: 3, background: { r: 230, g: 140, b: 60 } },
  }).png().toBuffer();
  return sharp(bg)
    .composite([
      { input: blueBox, top: 150, left: 50 },
      { input: greenBox, top: 150, left: 310 },
      { input: orangeBox, top: 150, left: 570 },
    ])
    .png()
    .toBuffer();
}

const describeFn = HAS_OPENAI ? describe : describe.skip;

describeFn('full upload → process → report flow (real OpenAI)', () => {
  let stack: E2EStack;

  beforeAll(async () => {
    stack = await startStack();
  }, 180000);

  afterAll(async () => {
    if (stack) await stack.teardown();
  }, 60000);

  it('uploads a diagram, processes it via OpenAI, and produces a structured report', async () => {
    const png = await makeDiagramPng();
    const form = new FormData();
    form.append('file', png, { filename: 'diagram.png', contentType: 'image/png' });

    const uploadRes = await axios.post(`${stack.gatewayUrl}/api/v1/upload`, form, {
      headers: { ...form.getHeaders(), 'x-api-key': stack.apiKey },
    });
    expect(uploadRes.status).toBe(202);
    expect(uploadRes.data.status).toBe(AnalysisStatus.RECEBIDO);
    const analysisId: string = uploadRes.data.analysis_id;
    expect(analysisId).toMatch(/^[0-9a-f-]{36}$/);

    const deadline = Date.now() + 150000;
    let lastStatus: string = 'unknown';
    while (Date.now() < deadline) {
      const statusRes = await axios.get(`${stack.gatewayUrl}/api/v1/status/${analysisId}`, {
        headers: { 'x-api-key': stack.apiKey },
      });
      lastStatus = statusRes.data.status;
      if (lastStatus === AnalysisStatus.ANALISADO || lastStatus === AnalysisStatus.ERRO) break;
      await new Promise((r) => setTimeout(r, 1500));
    }

    expect(lastStatus).toBe(AnalysisStatus.ANALISADO);

    const reportRes = await axios.get(`${stack.gatewayUrl}/api/v1/reports/${analysisId}`, {
      headers: { 'x-api-key': stack.apiKey },
    });
    expect(reportRes.status).toBe(200);
    expect(reportRes.data.analysis_id).toBe(analysisId);
    expect(reportRes.data.status).toBe(AnalysisStatus.ANALISADO);
    expect(reportRes.data.report).toEqual(
      expect.objectContaining({
        summary: expect.any(String),
        components: expect.any(Array),
        risks: expect.any(Array),
        recommendations: expect.any(Array),
      }),
    );
    expect(reportRes.data.metadata).toEqual(
      expect.objectContaining({
        model: expect.any(String),
        durationMs: expect.any(Number),
      }),
    );

    const path = require('path');
    const fs = require('fs');
    const out = path.join('/tmp', `fiap-report-${analysisId}.json`);
    fs.writeFileSync(out, JSON.stringify(reportRes.data, null, 2));
    process.stdout.write(`\n=== generated report saved to ${out} ===\n`);
    process.stdout.write(JSON.stringify(reportRes.data, null, 2) + '\n');
  });
});

if (!HAS_OPENAI) {
  describe('full flow e2e (real OpenAI)', () => {
    it.skip('skipped: set OPENAI_API_KEY to exercise the LLM happy path', () => undefined);
  });
}
