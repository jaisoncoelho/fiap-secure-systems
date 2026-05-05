import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { FileStoragePort, StoredFile } from '../../application/ports/file-storage.port';

@Injectable()
export class LocalFileStorage implements FileStoragePort {
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    this.baseDir = config.get<string>('UPLOAD_DIR', '/app/uploads');
  }

  async save(buffer: Buffer, originalName: string): Promise<StoredFile> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const ext = path.extname(originalName) || '';
    const filename = `${uuid()}${ext}`;
    const fullPath = path.join(this.baseDir, filename);
    await fs.writeFile(fullPath, buffer);
    return { path: fullPath, filename };
  }
}
