import { IsUUID } from 'class-validator';

export class AnalysisStartedEvent {
  @IsUUID()
  analysisId!: string;
}
