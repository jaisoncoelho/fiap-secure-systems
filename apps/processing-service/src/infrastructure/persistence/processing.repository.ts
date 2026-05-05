import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalysisStatus } from '@app/shared';
import { Repository } from 'typeorm';
import { ProcessingTrackingPort } from '../../application/ports/processing.repository.port';
import { ProcessingJobOrmEntity } from './processing-job.orm-entity';

@Injectable()
export class ProcessingRepository implements ProcessingTrackingPort {
  constructor(
    @InjectRepository(ProcessingJobOrmEntity)
    private readonly repo: Repository<ProcessingJobOrmEntity>,
  ) {}

  async recordStarted(analysisId: string): Promise<void> {
    await this.repo.upsert(
      { analysisId, status: AnalysisStatus.EM_PROCESSAMENTO, durationMs: null, errorReason: null },
      ['analysisId'],
    );
  }

  async recordCompleted(analysisId: string, durationMs: number): Promise<void> {
    await this.repo.update(
      { analysisId },
      { status: AnalysisStatus.ANALISADO, durationMs, errorReason: null },
    );
  }

  async recordFailed(analysisId: string, reason: string): Promise<void> {
    await this.repo.update(
      { analysisId },
      { status: AnalysisStatus.ERRO, errorReason: reason },
    );
  }

  async getStatus(analysisId: string): Promise<AnalysisStatus | null> {
    const found = await this.repo.findOne({ where: { analysisId } });
    return found?.status ?? null;
  }
}
