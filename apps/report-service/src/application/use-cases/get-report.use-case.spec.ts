import { NotFoundException } from '@nestjs/common';
import { AnalysisStatus } from '@app/shared';
import { GetReportUseCase } from './get-report.use-case';
import { Report } from '../../domain/entities/report.entity';

describe('GetReportUseCase', () => {
  const sample = () =>
    new Report({
      analysisId: 'a1',
      status: AnalysisStatus.ANALISADO,
      payload: { summary: 's', components: [], risks: [], recommendations: [] },
      metadata: { model: 'gpt-4o' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  it('returns the stored report', async () => {
    const repo = { save: jest.fn(), findById: jest.fn(async () => sample()) };
    const useCase = new GetReportUseCase(repo);
    const result = await useCase.execute('a1');
    expect(result.analysisId).toBe('a1');
  });

  it('throws NotFound when report missing', async () => {
    const repo = { save: jest.fn(), findById: jest.fn(async () => null) };
    const useCase = new GetReportUseCase(repo);
    await expect(useCase.execute('x')).rejects.toThrow(NotFoundException);
  });
});
