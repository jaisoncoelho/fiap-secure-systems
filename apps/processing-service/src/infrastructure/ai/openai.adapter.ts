import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiAnalyzerInput,
  AiAnalyzerOutput,
  AiAnalyzerPort,
} from '../../application/ports/ai-analyzer.port';
import { GuardrailValidationError, parseJsonSafe, validateReportPayload } from './guardrails';
import { prepareImages } from './file-to-images';
import { PROMPT_VERSION, RETRY_PROMPT, SYSTEM_PROMPT, USER_PROMPT } from './prompts';

@Injectable()
export class OpenAiAdapter implements AiAnalyzerPort {
  private readonly logger = new Logger(OpenAiAdapter.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not set — AI calls will fail');
    }
    this.timeoutMs = parseInt(config.get('OPENAI_TIMEOUT_MS', '60000'), 10);
    this.maxRetries = parseInt(config.get('OPENAI_MAX_RETRIES', '2'), 10);
    this.model = config.get('OPENAI_MODEL', 'gpt-4o');
    this.client = new OpenAI({ apiKey: apiKey || 'missing', timeout: this.timeoutMs });
  }

  async analyze(input: AiAnalyzerInput): Promise<AiAnalyzerOutput> {
    const start = Date.now();
    const images = await prepareImages(input.filePath, input.mimeType);
    if (images.length === 0) {
      throw new Error('no images extracted from input file');
    }

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: 'text', text: USER_PROMPT },
      ...images.map<OpenAI.Chat.Completions.ChatCompletionContentPartImage>((img) => ({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.base64}`, detail: 'high' },
      })),
    ];

    let lastError: Error | null = null;
    let validationDetails: string | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ];
        if (attempt > 0 && validationDetails) {
          messages.push({
            role: 'user',
            content: RETRY_PROMPT.replace('{{ERROR}}', validationDetails),
          });
        }

        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2500,
        });

        const text = completion.choices[0]?.message?.content?.trim();
        if (!text) throw new Error('empty completion');

        const parsed = parseJsonSafe(text);
        const validated = await validateReportPayload(parsed);

        return {
          report: validated,
          model: this.model,
          promptVersion: PROMPT_VERSION,
          durationMs: Date.now() - start,
          tokensUsed: completion.usage?.total_tokens,
        };
      } catch (err) {
        lastError = err as Error;
        if (err instanceof GuardrailValidationError) {
          validationDetails = err.details;
          this.logger.warn(`Guardrail failed (attempt ${attempt + 1}): ${err.details}`);
          continue;
        }
        if (err instanceof SyntaxError) {
          validationDetails = `invalid json: ${err.message}`;
          this.logger.warn(`JSON parse failed (attempt ${attempt + 1}): ${err.message}`);
          continue;
        }
        this.logger.error(`OpenAI call failed (attempt ${attempt + 1}): ${(err as Error).message}`);
        if (attempt === this.maxRetries) break;
      }
    }

    throw new Error(`AI analysis failed: ${lastError?.message ?? 'unknown error'}`);
  }
}
