import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../../src/client/GeminiClient';
import { GemBack } from '../../src/client/FallbackClient';
import { GeminiBackError } from '../../src/types/errors';

const mockModels = {
  embedContent: vi.fn(),
};

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: mockModels,
  })),
}));

describe('Embedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModels.embedContent.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });
  });

  describe('GeminiClient.embedContent', () => {
    it('should generate embeddings successfully', async () => {
      const client = new GeminiClient();
      const response = await client.embedContent('Hello', 'text-embedding-004', 'test-api-key');

      expect(response).toEqual({
        embeddings: [[0.1, 0.2, 0.3]],
        model: 'text-embedding-004',
        usage: undefined,
      });

      expect(mockModels.embedContent).toHaveBeenCalledWith({
        model: 'text-embedding-004',
        contents: ['Hello'],
        config: {
          title: undefined,
          taskType: undefined,
          outputDimensionality: undefined,
        },
      });
    });

    it('should handle array of content', async () => {
        mockModels.embedContent.mockResolvedValue({
            embeddings: [
                { values: [0.1, 0.2, 0.3] },
                { values: [0.4, 0.5, 0.6] }
            ],
        });
      const client = new GeminiClient();
      const response = await client.embedContent(['Hello', 'World'], 'text-embedding-004', 'test-api-key');

      expect(response.embeddings).toHaveLength(2);
      expect(response.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(response.embeddings[1]).toEqual([0.4, 0.5, 0.6]);

      expect(mockModels.embedContent).toHaveBeenCalledWith({
        model: 'text-embedding-004',
        contents: ['Hello', 'World'],
        config: {
          title: undefined,
          taskType: undefined,
          outputDimensionality: undefined,
        },
      });
    });

    it('should pass embed options', async () => {
      const client = new GeminiClient();
      await client.embedContent('Hello', 'text-embedding-004', 'test-api-key', {
        taskType: 'RETRIEVAL_QUERY',
        title: 'Test Query',
        outputDimensionality: 768,
      });

      expect(mockModels.embedContent).toHaveBeenCalledWith({
        model: 'text-embedding-004',
        contents: ['Hello'],
        config: {
          taskType: 'RETRIEVAL_QUERY',
          title: 'Test Query',
          outputDimensionality: 768,
        },
      });
    });
  });

  describe('GemBack.embed', () => {
      // Mock retry logic to fail fast
      const clientOptions = {
          apiKey: 'test-api-key',
          retryDelay: 1,
      };

    it('should use fallback logic for embeddings', async () => {
        const gemBack = new GemBack({
            ...clientOptions,
            embeddingFallbackOrder: ['text-embedding-004', 'gemini-embedding-001'],
        });

        // First model fails
        mockModels.embedContent.mockRejectedValueOnce(new Error('First model failed'));
        // Second model succeeds
        mockModels.embedContent.mockResolvedValueOnce({
            embeddings: [{ values: [0.9, 0.8, 0.7] }],
        });

        const response = await gemBack.embed('Hello');

        expect(response.model).toBe('gemini-embedding-001');
        expect(response.embeddings[0]).toEqual([0.9, 0.8, 0.7]);

        expect(mockModels.embedContent).toHaveBeenCalledTimes(2);
        expect(mockModels.embedContent).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: 'text-embedding-004' }));
        expect(mockModels.embedContent).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: 'gemini-embedding-001' }));
    });

    it('should throw if all models fail', async () => {
        const gemBack = new GemBack({
            ...clientOptions,
            embeddingFallbackOrder: ['text-embedding-004'],
            maxRetries: 1,
        });

        mockModels.embedContent.mockRejectedValue(new Error('Model failed'));

        await expect(gemBack.embed('Hello')).rejects.toThrow('All models failed for embedding');
    });

    it('should track usage stats for embeddings', async () => {
        const gemBack = new GemBack(clientOptions);

        await gemBack.embed('Hello', { model: 'text-embedding-004' });

        const stats = gemBack.getFallbackStats();
        expect(stats.totalRequests).toBe(1);
        expect(stats.modelUsage['text-embedding-004']).toBe(1);
    });
  });
});
