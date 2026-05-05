import { NotFoundException } from '@nestjs/common';
import { AnalysisStatus } from '@app/shared';
import { GetStatusUseCase } from './get-status.use-case';
import { Analysis } from '../../domain/entities/analysis.entity';

describe('GetStatusUseCase', () => {
  const buildAnalysis = () =>
    new Analysis({
      id: 'a1',
      status: AnalysisStatus.EM_PROCESSAMENTO,
      filePath: '/u/a.png',
      originalName: 'a.png',
      mimeType: 'image/png',
      sizeBytes: 100,
      errorReason: null,
      createdAt: new Date('2026-05-05'),
      updatedAt: new Date('2026-05-05'),
    });

  it('returns status for existing analysis', async () => {
    const repo = { findById: jest.fn(async () => buildAnalysis()), save: jest.fn(), updateStatus: jest.fn(), markFailed: jest.fn() };
    const useCase = new GetStatusUseCase(repo);
    const result = await useCase.execute('a1');
    expect(result.status).toBe(AnalysisStatus.EM_PROCESSAMENTO);
    expect(result.analysisId).toBe('a1');
  });

  it('throws NotFound when analysis does not exist', async () => {
    const repo = { findById: jest.fn(async () => null), save: jest.fn(), updateStatus: jest.fn(), markFailed: jest.fn() };
    const useCase = new GetStatusUseCase(repo);
    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });
});
