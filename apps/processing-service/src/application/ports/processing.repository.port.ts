import { AnalysisStatus } from '@app/shared';

export const PROCESSING_REPOSITORY = Symbol('PROCESSING_REPOSITORY');

export interface ProcessingTrackingPort {
  recordStarted(analysisId: string): Promise<void>;
  recordCompleted(analysisId: string, durationMs: number): Promise<void>;
  recordFailed(analysisId: string, reason: string): Promise<void>;
  getStatus(analysisId: string): Promise<AnalysisStatus | null>;
}
