import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Report } from '../../domain/entities/report.entity';
import { REPORT_REPOSITORY, ReportRepositoryPort } from '../ports/report.repository.port';

@Injectable()
export class GetReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly repo: ReportRepositoryPort,
  ) {}

  async execute(analysisId: string): Promise<Report> {
    const report = await this.repo.findById(analysisId);
    if (!report) throw new NotFoundException(`Report ${analysisId} not found`);
    return report;
  }
}
