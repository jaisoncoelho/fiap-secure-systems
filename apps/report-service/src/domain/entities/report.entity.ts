import { AnalysisStatus, ReportPayloadDto } from '@app/shared';

export interface AnalysisMetadata {
  model: string;
  promptVersion?: string;
  durationMs?: number;
  tokensUsed?: number;
}

export interface ReportProps {
  analysisId: string;
  status: AnalysisStatus;
  payload: ReportPayloadDto;
  metadata: AnalysisMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export class Report {
  constructor(private props: ReportProps) {}

  get analysisId() {
    return this.props.analysisId;
  }
  get status() {
    return this.props.status;
  }
  get payload() {
    return this.props.payload;
  }
  get metadata() {
    return this.props.metadata;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }

  toJSON(): ReportProps {
    return { ...this.props };
  }
}
