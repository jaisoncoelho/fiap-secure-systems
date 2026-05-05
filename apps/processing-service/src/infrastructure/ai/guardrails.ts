import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ReportPayloadDto } from '@app/shared';

export class GuardrailValidationError extends Error {
  constructor(message: string, public readonly details: string) {
    super(message);
  }
}

const flattenErrors = (errs: ValidationError[], path = ''): string[] => {
  const out: string[] = [];
  for (const e of errs) {
    const newPath = path ? `${path}.${e.property}` : e.property;
    if (e.constraints) {
      out.push(`${newPath}: ${Object.values(e.constraints).join(', ')}`);
    }
    if (e.children?.length) {
      out.push(...flattenErrors(e.children, newPath));
    }
  }
  return out;
};

export async function validateReportPayload(raw: unknown): Promise<ReportPayloadDto> {
  if (!raw || typeof raw !== 'object') {
    throw new GuardrailValidationError('LLM response is not an object', 'root: not an object');
  }
  const dto = plainToInstance(ReportPayloadDto, raw as object);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
  if (errors.length > 0) {
    const flat = flattenErrors(errors);
    throw new GuardrailValidationError(
      'LLM response did not match schema',
      flat.join('; '),
    );
  }
  return dto;
}

export function parseJsonSafe(text: string): unknown {
  const trimmed = text.trim();
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(stripped);
}
