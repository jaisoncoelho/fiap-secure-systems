import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AnalysisRequestedEvent {
  @IsUUID()
  analysisId!: string;

  @IsString()
  @IsNotEmpty()
  filePath!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  originalName!: string;
}
