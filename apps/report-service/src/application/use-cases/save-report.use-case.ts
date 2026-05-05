import { Inject, Injectable, Logger } from '@nestjs/common';
import { AnalysisCompletedEvent, AnalysisStatus } from '@app/shared';
import { Report } from '../../domain/entities/report.entity';
import { REPORT_REPOSITORY, ReportRepositoryPort } from '../ports/report.repository.port';

@Injectable()
export class SaveReportUseCase {
  private readonly logger = new Logger(SaveReportUseCase.name);

  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repo: ReportRepositoryPort,
  ) {}

  async execute(event: AnalysisCompletedEvent): Promise<void> {
    const now = new Date();
    const report = new Report({
      analysisId: event.analysisId,
      status: AnalysisStatus.ANALISADO,
      payload: event.report,
      metadata: event.metadata,
      createdAt: now,
      updatedAt: now,
    });
    await this.repo.save(report);
    this.logger.log(`Saved report for ${event.analysisId}`);
  }
}
