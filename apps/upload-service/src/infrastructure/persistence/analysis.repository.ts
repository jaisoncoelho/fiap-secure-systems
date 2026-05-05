import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalysisStatus } from '@app/shared';
import { Repository } from 'typeorm';
import { Analysis } from '../../domain/entities/analysis.entity';
import { AnalysisRepositoryPort } from '../../application/ports/analysis.repository.port';
import { AnalysisOrmEntity } from './analysis.orm-entity';

@Injectable()
export class AnalysisRepository implements AnalysisRepositoryPort {
  constructor(
    @InjectRepository(AnalysisOrmEntity)
    private readonly repo: Repository<AnalysisOrmEntity>,
  ) {}

  async save(analysis: Analysis): Promise<Analysis> {
    const props = analysis.toJSON();
    const entity = this.repo.create({
      id: props.id,
      status: props.status,
      filePath: props.filePath,
      originalName: props.originalName,
      mimeType: props.mimeType,
      sizeBytes: props.sizeBytes,
      errorReason: props.errorReason,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Analysis | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async updateStatus(id: string, status: AnalysisStatus): Promise<void> {
    await this.repo.update({ id }, { status });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.repo.update(
      { id },
      { status: AnalysisStatus.ERRO, errorReason: reason },
    );
  }

  private toDomain(orm: AnalysisOrmEntity): Analysis {
    return new Analysis({
      id: orm.id,
      status: orm.status,
      filePath: orm.filePath,
      originalName: orm.originalName,
      mimeType: orm.mimeType,
      sizeBytes: Number(orm.sizeBytes),
      errorReason: orm.errorReason,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }
}
