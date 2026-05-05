import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ComponentDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

export class RiskDto {
  @IsString()
  title!: string;

  @IsString()
  severity!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

export class RecommendationDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  priority!: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class ReportPayloadDto {
  @IsString()
  summary!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ComponentDto)
  components!: ComponentDto[];

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RiskDto)
  risks!: RiskDto[];

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecommendationDto)
  recommendations!: RecommendationDto[];

  @IsOptional()
  @IsString()
  language?: string;
}
