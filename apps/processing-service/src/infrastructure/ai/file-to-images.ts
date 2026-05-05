import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fromPath } from 'pdf2pic';
import { Logger } from '@nestjs/common';

const logger = new Logger('FileToImages');

const MAX_PDF_PAGES = 5;

export interface PreparedImage {
  base64: string;
  mimeType: string;
}

export async function prepareImages(filePath: string, mimeType: string): Promise<PreparedImage[]> {
  if (mimeType === 'application/pdf') {
    return convertPdf(filePath);
  }
  const buf = await fs.readFile(filePath);
  return [{ base64: buf.toString('base64'), mimeType }];
}

async function convertPdf(filePath: string): Promise<PreparedImage[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fiap-pdf-'));
  try {
    const converter = fromPath(filePath, {
      density: 150,
      saveFilename: 'page',
      savePath: tmpDir,
      format: 'png',
      width: 1600,
      height: 1600,
    });
    const pages = await converter.bulk(-1, { responseType: 'image' });
    const limited = pages.slice(0, MAX_PDF_PAGES);
    if (pages.length > MAX_PDF_PAGES) {
      logger.warn(`PDF has ${pages.length} pages; processing only first ${MAX_PDF_PAGES}`);
    }
    const out: PreparedImage[] = [];
    for (const page of limited) {
      if (!page.path) continue;
      const data = await fs.readFile(page.path);
      out.push({ base64: data.toString('base64'), mimeType: 'image/png' });
    }
    return out;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
