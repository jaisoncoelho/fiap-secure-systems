import { ReportPayloadDto } from '@app/shared';

export const AI_ANALYZER = Symbol('AI_ANALYZER');

export interface AiAnalyzerInput {
  analysisId: string;
  filePath: string;
  mimeType: string;
  originalName: string;
}

export interface AiAnalyzerOutput {
  report: ReportPayloadDto;
  model: string;
  promptVersion: string;
  durationMs: number;
  tokensUsed?: number;
}

export interface AiAnalyzerPort {
  analyze(input: AiAnalyzerInput): Promise<AiAnalyzerOutput>;
}
