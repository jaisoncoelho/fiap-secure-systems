import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AnalysisFailedEvent {
  @IsUUID()
  analysisId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
