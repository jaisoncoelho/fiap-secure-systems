import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../domain/entities/report.entity';
import { ReportRepositoryPort } from '../../application/ports/report.repository.port';
import { ReportOrmEntity } from './report.orm-entity';

@Injectable()
export class ReportRepository implements ReportRepositoryPort {
  constructor(
    @InjectRepository(ReportOrmEntity)
    private readonly repo: Repository<ReportOrmEntity>,
  ) {}

  async save(report: Report): Promise<Report> {
    const props = report.toJSON();
    await this.repo.upsert(
      {
        analysisId: props.analysisId,
        status: props.status,
        payload: props.payload,
        metadata: props.metadata,
      },
      ['analysisId'],
    );
    const saved = await this.repo.findOneOrFail({ where: { analysisId: props.analysisId } });
    return this.toDomain(saved);
  }

  async findById(analysisId: string): Promise<Report | null> {
    const found = await this.repo.findOne({ where: { analysisId } });
    return found ? this.toDomain(found) : null;
  }

  private toDomain(orm: ReportOrmEntity): Report {
    return new Report({
      analysisId: orm.analysisId,
      status: orm.status,
      payload: orm.payload,
      metadata: orm.metadata,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }
}
