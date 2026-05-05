import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisStatus } from '@app/shared';
import {
  ANALYSIS_REPOSITORY,
  AnalysisRepositoryPort,
} from '../ports/analysis.repository.port';

export interface GetStatusOutput {
  analysisId: string;
  status: AnalysisStatus;
  errorReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class GetStatusUseCase {
  constructor(
    @Inject(ANALYSIS_REPOSITORY) private readonly repo: AnalysisRepositoryPort,
  ) {}

  async execute(id: string): Promise<GetStatusOutput> {
    const analysis = await this.repo.findById(id);
    if (!analysis) throw new NotFoundException(`Analysis ${id} not found`);
    return {
      analysisId: analysis.id,
      status: analysis.status,
      errorReason: analysis.errorReason,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}
