import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path === '/health' || request.path.endsWith('/health')) return true;
    if (request.path === '/docs' || request.path.startsWith('/docs')) return true;

    const expected = this.config.get<string>('API_KEY');
    if (!expected) {
      this.logger.warn('API_KEY not configured — rejecting all requests');
      throw new UnauthorizedException('api key not configured');
    }
    const provided = request.header('x-api-key');
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('invalid or missing api key');
    }
    return true;
  }
}
