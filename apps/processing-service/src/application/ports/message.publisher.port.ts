import {
  AnalysisCompletedEvent,
  AnalysisFailedEvent,
  AnalysisStartedEvent,
} from '@app/shared';

export const PROCESSING_PUBLISHER = Symbol('PROCESSING_PUBLISHER');

export interface ProcessingPublisherPort {
  publishStarted(event: AnalysisStartedEvent): Promise<void>;
  publishCompleted(event: AnalysisCompletedEvent): Promise<void>;
  publishFailed(event: AnalysisFailedEvent): Promise<void>;
}
