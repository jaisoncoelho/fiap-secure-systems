import { ReportPayloadDto } from '@app/shared';

export interface AnalysisMetadata {
  model: string;
  promptVersion: string;
  durationMs: number;
  tokensUsed?: number;
}

export class ProcessingResult {
  constructor(
    public readonly analysisId: string,
    public readonly report: ReportPayloadDto,
    public readonly metadata: AnalysisMetadata,
  ) {}
}
