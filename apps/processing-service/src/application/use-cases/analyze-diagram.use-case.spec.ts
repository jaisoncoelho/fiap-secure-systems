import { AnalyzeDiagramUseCase } from './analyze-diagram.use-case';
import { AiAnalyzerPort } from '../ports/ai-analyzer.port';
import { ProcessingPublisherPort } from '../ports/message.publisher.port';
import { ProcessingTrackingPort } from '../ports/processing.repository.port';

describe('AnalyzeDiagramUseCase', () => {
  let analyzer: jest.Mocked<AiAnalyzerPort>;
  let publisher: jest.Mocked<ProcessingPublisherPort>;
  let tracker: jest.Mocked<ProcessingTrackingPort>;
  let useCase: AnalyzeDiagramUseCase;

  const event = {
    analysisId: 'a1',
    filePath: '/u/a.png',
    mimeType: 'image/png',
    originalName: 'a.png',
  };

  beforeEach(() => {
    analyzer = {
      analyze: jest.fn().mockResolvedValue({
        report: {
          summary: 'ok',
          components: [],
          risks: [],
          recommendations: [],
        },
        model: 'gpt-4o',
        promptVersion: 'v1',
        durationMs: 10,
        tokensUsed: 100,
      }),
    };
    publisher = {
      publishStarted: jest.fn(),
      publishCompleted: jest.fn(),
      publishFailed: jest.fn(),
    };
    tracker = {
      recordStarted: jest.fn(),
      recordCompleted: jest.fn(),
      recordFailed: jest.fn(),
      getStatus: jest.fn(),
    };
    useCase = new AnalyzeDiagramUseCase(analyzer, publisher, tracker);
  });

  it('runs the AI pipeline and publishes completed on success', async () => {
    await useCase.execute(event);

    expect(tracker.recordStarted).toHaveBeenCalledWith('a1');
    expect(analyzer.analyze).toHaveBeenCalled();
    expect(tracker.recordCompleted).toHaveBeenCalled();
    expect(publisher.publishCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ analysisId: 'a1' }),
    );
    expect(publisher.publishFailed).not.toHaveBeenCalled();
  });

  it('publishes failed and records error when analyzer throws', async () => {
    analyzer.analyze.mockRejectedValueOnce(new Error('llm timeout'));

    await useCase.execute(event);

    expect(tracker.recordFailed).toHaveBeenCalledWith('a1', 'llm timeout');
    expect(publisher.publishFailed).toHaveBeenCalledWith({
      analysisId: 'a1',
      reason: 'llm timeout',
    });
    expect(publisher.publishCompleted).not.toHaveBeenCalled();
  });
});
