import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadDiagramUseCase } from '../../application/use-cases/upload-diagram.use-case';
import { GetStatusUseCase } from '../../application/use-cases/get-status.use-case';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);
const MAX_BYTES = 15 * 1024 * 1024;

@Controller()
export class UploadController {
  constructor(
    private readonly uploadDiagram: UploadDiagramUseCase,
    private readonly getStatus: GetStatusUseCase,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file field is required');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`unsupported mime type: ${file.mimetype}`);
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException(`file too large (${file.size} bytes)`);
    }

    const result = await this.uploadDiagram.execute({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
    return { analysis_id: result.analysisId, status: result.status };
  }

  @Get('status/:id')
  async status(@Param('id', new ParseUUIDPipe()) id: string) {
    const result = await this.getStatus.execute(id);
    return {
      analysis_id: result.analysisId,
      status: result.status,
      error_reason: result.errorReason,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    };
  }
}
