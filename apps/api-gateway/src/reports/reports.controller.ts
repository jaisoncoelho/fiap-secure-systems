import { Controller, Get, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import axios, { AxiosError } from 'axios';
import { Response } from 'express';

@ApiTags('analysis')
@ApiSecurity('api-key')
@Controller('api/v1')
export class ReportsProxyController {
  constructor(private readonly config: ConfigService) {}

  private get reportServiceUrl() {
    return this.config.get<string>('REPORT_SERVICE_URL', 'http://report-service:3003');
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Fetch the structured AI report for an analysis' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        analysis_id: '5d286f1e-32e6-4d55-906a-9908fd046773',
        status: 'ANALISADO',
        report: {
          summary: 'string',
          components: [
            { name: 'API', type: 'api', description: '...', confidence: 0.9 },
          ],
          risks: [
            { title: '...', severity: 'HIGH', description: '...', confidence: 0.8 },
          ],
          recommendations: [
            { title: '...', description: '...', priority: 'HIGH' },
          ],
          language: 'pt-BR',
        },
        metadata: {
          model: 'gpt-4o',
          promptVersion: 'v1.0.0',
          durationMs: 3085,
          tokensUsed: 964,
        },
        created_at: '2026-05-05T11:11:39.000Z',
        updated_at: '2026-05-05T11:11:39.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Report not yet available' })
  async getReport(@Param('id') id: string, @Res() res: Response) {
    try {
      const upstream = await axios.get(`${this.reportServiceUrl}/reports/${id}`);
      res.status(upstream.status).json(upstream.data);
    } catch (err) {
      const axErr = err as AxiosError;
      if (axErr.response) {
        res.status(axErr.response.status).json(axErr.response.data);
        return;
      }
      res.status(502).json({ message: 'upstream unavailable', error: axErr.message });
    }
  }
}
