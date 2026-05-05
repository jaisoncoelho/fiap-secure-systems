import { AnalysisStatus } from '@app/shared';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'processing_jobs' })
export class ProcessingJobOrmEntity {
  @PrimaryColumn('uuid')
  analysisId!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: AnalysisStatus;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  @Column({ name: 'error_reason', type: 'text', nullable: true })
  errorReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
