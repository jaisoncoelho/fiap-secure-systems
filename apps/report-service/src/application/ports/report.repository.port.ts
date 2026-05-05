import { Report } from '../../domain/entities/report.entity';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepositoryPort {
  save(report: Report): Promise<Report>;
  findById(analysisId: string): Promise<Report | null>;
}
