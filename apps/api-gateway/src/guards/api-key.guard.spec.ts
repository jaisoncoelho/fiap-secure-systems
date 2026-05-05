import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

const buildContext = (path: string, header?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        path,
        header: (name: string) =>
          name.toLowerCase() === 'x-api-key' ? header : undefined,
      }),
    }),
  }) as ExecutionContext;

describe('ApiKeyGuard', () => {
  it('allows /health without an api key', () => {
    const guard = new ApiKeyGuard(new ConfigService({ API_KEY: 'secret' }));
    expect(guard.canActivate(buildContext('/health'))).toBe(true);
  });

  it('accepts a matching x-api-key header', () => {
    const guard = new ApiKeyGuard(new ConfigService({ API_KEY: 'secret' }));
    expect(guard.canActivate(buildContext('/api/v1/upload', 'secret'))).toBe(true);
  });

  it('rejects a missing or wrong api key', () => {
    const guard = new ApiKeyGuard(new ConfigService({ API_KEY: 'secret' }));
    expect(() => guard.canActivate(buildContext('/api/v1/upload'))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(buildContext('/api/v1/upload', 'wrong'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when API_KEY is not configured', () => {
    const guard = new ApiKeyGuard(new ConfigService({}));
    expect(() => guard.canActivate(buildContext('/api/v1/upload', 'x'))).toThrow(
      UnauthorizedException,
    );
  });
});
