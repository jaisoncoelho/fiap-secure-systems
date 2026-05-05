import { AnalysisStatus } from '@app/shared';
import { Analysis } from '../../domain/entities/analysis.entity';

export const ANALYSIS_REPOSITORY = Symbol('ANALYSIS_REPOSITORY');

export interface AnalysisRepositoryPort {
  save(analysis: Analysis): Promise<Analysis>;
  findById(id: string): Promise<Analysis | null>;
  updateStatus(id: string, status: AnalysisStatus): Promise<void>;
  markFailed(id: string, reason: string): Promise<void>;
}
