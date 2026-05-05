import { AnalysisRequestedEvent } from '@app/shared';

export const MESSAGE_PUBLISHER = Symbol('UPLOAD_MESSAGE_PUBLISHER');

export interface MessagePublisherPort {
  publishAnalysisRequested(event: AnalysisRequestedEvent): Promise<void>;
}
