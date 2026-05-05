import { GuardrailValidationError, parseJsonSafe, validateReportPayload } from './guardrails';

describe('guardrails', () => {
  describe('parseJsonSafe', () => {
    it('parses plain JSON', () => {
      expect(parseJsonSafe('{"a":1}')).toEqual({ a: 1 });
    });

    it('strips ```json fences', () => {
      expect(parseJsonSafe('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    });

    it('strips bare ``` fences', () => {
      expect(parseJsonSafe('```\n{"a":2}\n```')).toEqual({ a: 2 });
    });
  });

  describe('validateReportPayload', () => {
    const valid = {
      summary: 'API fronted by gateway',
      components: [
        { name: 'API', type: 'api', description: 'public api', confidence: 0.9 },
      ],
      risks: [
        {
          title: 'no rate limiting',
          severity: 'HIGH',
          description: 'risk of abuse',
          confidence: 0.8,
        },
      ],
      recommendations: [
        { title: 'add rate limit', description: 'use token bucket', priority: 'HIGH' },
      ],
      language: 'pt-BR',
    };

    it('accepts a well-formed payload', async () => {
      const dto = await validateReportPayload(valid);
      expect(dto.components).toHaveLength(1);
    });

    it('rejects missing required fields', async () => {
      await expect(
        validateReportPayload({ summary: 'x', components: [], risks: [] }),
      ).rejects.toThrow(GuardrailValidationError);
    });

    it('rejects non-object input', async () => {
      await expect(validateReportPayload('not an object')).rejects.toThrow(GuardrailValidationError);
    });

    it('rejects component confidence > 1', async () => {
      await expect(
        validateReportPayload({
          ...valid,
          components: [
            { name: 'x', type: 'api', description: 'd', confidence: 1.5 },
          ],
        }),
      ).rejects.toThrow(GuardrailValidationError);
    });
  });
});
