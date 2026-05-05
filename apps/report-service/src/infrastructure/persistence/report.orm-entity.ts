import { AnalysisStatus, ReportPayloadDto } from '@app/shared';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { AnalysisMetadata } from '../../domain/entities/report.entity';

@Entity({ name: 'reports' })
export class ReportOrmEntity {
  @PrimaryColumn('uuid', { name: 'analysis_id' })
  analysisId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: AnalysisStatus;

  @Column({ type: 'jsonb' })
  payload!: ReportPayloadDto;

  @Column({ type: 'jsonb' })
  metadata!: AnalysisMetadata;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
