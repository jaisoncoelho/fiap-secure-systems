import { Inject, Injectable, Logger } from '@nestjs/common';
import { AnalysisRequestedEvent } from '@app/shared';
import { AI_ANALYZER, AiAnalyzerPort } from '../ports/ai-analyzer.port';
import {
  PROCESSING_PUBLISHER,
  ProcessingPublisherPort,
} from '../ports/message.publisher.port';
import {
  PROCESSING_REPOSITORY,
  ProcessingTrackingPort,
} from '../ports/processing.repository.port';

@Injectable()
export class AnalyzeDiagramUseCase {
  private readonly logger = new Logger(AnalyzeDiagramUseCase.name);

  constructor(
    @Inject(AI_ANALYZER) private readonly analyzer: AiAnalyzerPort,
    @Inject(PROCESSING_PUBLISHER) private readonly publisher: ProcessingPublisherPort,
    @Inject(PROCESSING_REPOSITORY) private readonly tracker: ProcessingTrackingPort,
  ) {}

  async execute(event: AnalysisRequestedEvent): Promise<void> {
    const startedAt = Date.now();
    this.logger.log(`Starting analysis ${event.analysisId} (${event.originalName})`);
    await this.tracker.recordStarted(event.analysisId);
    await this.publisher.publishStarted({ analysisId: event.analysisId });

    try {
      const result = await this.analyzer.analyze({
        analysisId: event.analysisId,
        filePath: event.filePath,
        mimeType: event.mimeType,
        originalName: event.originalName,
      });

      const durationMs = Date.now() - startedAt;
      await this.tracker.recordCompleted(event.analysisId, durationMs);

      await this.publisher.publishCompleted({
        analysisId: event.analysisId,
        report: result.report,
        metadata: {
          model: result.model,
          promptVersion: result.promptVersion,
          durationMs,
          tokensUsed: result.tokensUsed,
        },
      });
      this.logger.log(`Completed ${event.analysisId} in ${durationMs}ms`);
    } catch (err) {
      const reason = (err as Error).message || 'unknown error';
      this.logger.error(`Analysis ${event.analysisId} failed: ${reason}`);
      await this.tracker.recordFailed(event.analysisId, reason);
      await this.publisher.publishFailed({ analysisId: event.analysisId, reason });
    }
  }
}
