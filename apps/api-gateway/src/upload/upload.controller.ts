import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { Request, Response } from 'express';

const MAX_BYTES = 15 * 1024 * 1024;

@ApiTags('analysis')
@ApiSecurity('api-key')
@Controller('api/v1')
export class UploadProxyController {
  constructor(private readonly config: ConfigService) {}

  private get uploadServiceUrl() {
    return this.config.get<string>('UPLOAD_SERVICE_URL', 'http://upload-service:3001');
  }

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Submit an architecture diagram for analysis' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PNG, JPEG, WebP or PDF, up to 15 MB',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Analysis accepted',
    schema: {
      example: {
        analysis_id: '5d286f1e-32e6-4d55-906a-9908fd046773',
        status: 'RECEBIDO',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or unsupported mime type' })
  @ApiResponse({ status: 401, description: 'Missing or invalid api key' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!file) throw new BadRequestException('file field is required');

    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const upstream = await axios.post(`${this.uploadServiceUrl}/upload`, form, {
        headers: form.getHeaders(),
        maxBodyLength: MAX_BYTES,
        maxContentLength: MAX_BYTES,
      });
      res.status(upstream.status).json(upstream.data);
    } catch (err) {
      this.forwardError(err, res);
    }
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Get analysis lifecycle status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        analysis_id: '5d286f1e-32e6-4d55-906a-9908fd046773',
        status: 'EM_PROCESSAMENTO',
        error_reason: null,
        created_at: '2026-05-05T11:11:33.000Z',
        updated_at: '2026-05-05T11:11:36.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async status(@Param('id') id: string, @Res() res: Response) {
    try {
      const upstream = await axios.get(`${this.uploadServiceUrl}/status/${id}`);
      res.status(upstream.status).json(upstream.data);
    } catch (err) {
      this.forwardError(err, res);
    }
  }

  private forwardError(err: unknown, res: Response) {
    const axErr = err as AxiosError;
    if (axErr.response) {
      res.status(axErr.response.status).json(axErr.response.data);
      return;
    }
    res.status(502).json({ message: 'upstream unavailable', error: axErr.message });
  }
}
