import { AnalysisStatus } from '@app/shared';

export interface AnalysisProps {
  id: string;
  status: AnalysisStatus;
  filePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  errorReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Analysis {
  constructor(private props: AnalysisProps) {}

  get id() {
    return this.props.id;
  }
  get status() {
    return this.props.status;
  }
  get filePath() {
    return this.props.filePath;
  }
  get originalName() {
    return this.props.originalName;
  }
  get mimeType() {
    return this.props.mimeType;
  }
  get sizeBytes() {
    return this.props.sizeBytes;
  }
  get errorReason() {
    return this.props.errorReason;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }

  markFailed(reason: string) {
    this.props.status = AnalysisStatus.ERRO;
    this.props.errorReason = reason;
    this.props.updatedAt = new Date();
  }

  toJSON(): AnalysisProps {
    return { ...this.props };
  }
}
