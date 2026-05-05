import { AnalysisStatus } from '@app/shared';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'analyses' })
export class AnalysisOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: AnalysisStatus;

  @Column({ name: 'file_path', type: 'varchar', length: 1024 })
  filePath!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 512 })
  originalName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes!: number;

  @Column({ name: 'error_reason', type: 'text', nullable: true })
  errorReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
