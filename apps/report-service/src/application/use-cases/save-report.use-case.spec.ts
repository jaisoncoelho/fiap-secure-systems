import { AnalysisStatus } from '@app/shared';
import { SaveReportUseCase } from './save-report.use-case';
import { Report } from '../../domain/entities/report.entity';

describe('SaveReportUseCase', () => {
  it('persists a report with ANALISADO status', async () => {
    const repo = {
      save: jest.fn(async (r: Report) => r),
      findById: jest.fn(),
    };
    const useCase = new SaveReportUseCase(repo);

    await useCase.execute({
      analysisId: 'a1',
      report: { summary: 's', components: [], risks: [], recommendations: [] },
      metadata: { model: 'gpt-4o', promptVersion: 'v1', durationMs: 100 },
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved: Report = repo.save.mock.calls[0][0];
    expect(saved.status).toBe(AnalysisStatus.ANALISADO);
    expect(saved.analysisId).toBe('a1');
  });
});
