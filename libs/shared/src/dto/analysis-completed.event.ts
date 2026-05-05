import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ReportPayloadDto } from './report.dto';

export class AnalysisMetadataDto {
  @IsString()
  model!: string;

  @IsString()
  @IsOptional()
  promptVersion?: string;

  @IsOptional()
  tokensUsed?: number;

  @IsOptional()
  durationMs?: number;
}

export class AnalysisCompletedEvent {
  @IsUUID()
  analysisId!: string;

  @ValidateNested()
  @Type(() => ReportPayloadDto)
  @IsNotEmpty()
  report!: ReportPayloadDto;

  @ValidateNested()
  @Type(() => AnalysisMetadataDto)
  @IsObject()
  metadata!: AnalysisMetadataDto;
}
