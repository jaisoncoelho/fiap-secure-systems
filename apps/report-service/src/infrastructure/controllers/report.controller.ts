import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { GetReportUseCase } from '../../application/use-cases/get-report.use-case';

@Controller()
export class ReportController {
  constructor(private readonly getReport: GetReportUseCase) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'report-service' };
  }

  @Get('reports/:id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const report = await this.getReport.execute(id);
    return {
      analysis_id: report.analysisId,
      status: report.status,
      report: report.payload,
      metadata: report.metadata,
      created_at: report.createdAt,
      updated_at: report.updatedAt,
    };
  }
}
