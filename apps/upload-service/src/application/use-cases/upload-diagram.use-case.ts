import { Inject, Injectable, Logger } from '@nestjs/common';
import { AnalysisStatus } from '@app/shared';
import { v4 as uuid } from 'uuid';
import { Analysis } from '../../domain/entities/analysis.entity';
import {
  ANALYSIS_REPOSITORY,
  AnalysisRepositoryPort,
} from '../ports/analysis.repository.port';
import { FILE_STORAGE, FileStoragePort } from '../ports/file-storage.port';
import {
  MESSAGE_PUBLISHER,
  MessagePublisherPort,
} from '../ports/message.publisher.port';

export interface UploadDiagramInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadDiagramOutput {
  analysisId: string;
  status: AnalysisStatus;
}

@Injectable()
export class UploadDiagramUseCase {
  private readonly logger = new Logger(UploadDiagramUseCase.name);

  constructor(
    @Inject(ANALYSIS_REPOSITORY) private readonly repo: AnalysisRepositoryPort,
    @Inject(FILE_STORAGE) private readonly storage: FileStoragePort,
    @Inject(MESSAGE_PUBLISHER) private readonly publisher: MessagePublisherPort,
  ) {}

  async execute(input: UploadDiagramInput): Promise<UploadDiagramOutput> {
    const stored = await this.storage.save(input.buffer, input.originalName);

    const analysis = new Analysis({
      id: uuid(),
      status: AnalysisStatus.RECEBIDO,
      filePath: stored.path,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      errorReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.repo.save(analysis);

    try {
      await this.publisher.publishAnalysisRequested({
        analysisId: saved.id,
        filePath: saved.filePath,
        mimeType: saved.mimeType,
        originalName: saved.originalName,
      });
    } catch (err) {
      this.logger.error(
        `Failed to publish analysis.requested for ${saved.id}: ${(err as Error).message}`,
      );
      await this.repo.markFailed(saved.id, 'failed to enqueue analysis');
      throw err;
    }

    return { analysisId: saved.id, status: saved.status };
  }
}
