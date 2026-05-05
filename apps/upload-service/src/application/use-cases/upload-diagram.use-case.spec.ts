import { AnalysisStatus } from '@app/shared';
import { UploadDiagramUseCase } from './upload-diagram.use-case';
import { Analysis } from '../../domain/entities/analysis.entity';
import { AnalysisRepositoryPort } from '../ports/analysis.repository.port';
import { FileStoragePort } from '../ports/file-storage.port';
import { MessagePublisherPort } from '../ports/message.publisher.port';

describe('UploadDiagramUseCase', () => {
  let repo: jest.Mocked<AnalysisRepositoryPort>;
  let storage: jest.Mocked<FileStoragePort>;
  let publisher: jest.Mocked<MessagePublisherPort>;
  let useCase: UploadDiagramUseCase;

  beforeEach(() => {
    repo = {
      save: jest.fn().mockImplementation(async (a: Analysis) => a),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      markFailed: jest.fn(),
    };
    storage = {
      save: jest
        .fn()
        .mockResolvedValue({ path: '/uploads/abc.png', filename: 'abc.png' }),
    };
    publisher = { publishAnalysisRequested: jest.fn() };
    useCase = new UploadDiagramUseCase(repo, storage, publisher);
  });

  it('saves file, persists analysis as RECEBIDO and publishes the event', async () => {
    const result = await useCase.execute({
      buffer: Buffer.from('img'),
      originalName: 'd.png',
      mimeType: 'image/png',
      sizeBytes: 3,
    });

    expect(storage.save).toHaveBeenCalledWith(expect.any(Buffer), 'd.png');
    expect(repo.save).toHaveBeenCalled();
    expect(publisher.publishAnalysisRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId: result.analysisId,
        filePath: '/uploads/abc.png',
        mimeType: 'image/png',
      }),
    );
    expect(result.status).toBe(AnalysisStatus.RECEBIDO);
  });

  it('marks analysis as failed when publishing throws', async () => {
    publisher.publishAnalysisRequested.mockRejectedValueOnce(new Error('rmq down'));

    await expect(
      useCase.execute({
        buffer: Buffer.from('img'),
        originalName: 'd.png',
        mimeType: 'image/png',
        sizeBytes: 3,
      }),
    ).rejects.toThrow('rmq down');

    expect(repo.markFailed).toHaveBeenCalledWith(expect.any(String), 'failed to enqueue analysis');
  });
});
