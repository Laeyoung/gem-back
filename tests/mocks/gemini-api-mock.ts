import { vi } from 'vitest';

export const createMockGenerativeModel = (shouldFail = false, errorMessage = '') => {
  return {
    generateContent: vi.fn().mockImplementation(() => {
      if (shouldFail) {
        throw new Error(errorMessage);
      }
      return Promise.resolve({
        response: {
          text: () => 'Mock response text',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
        },
      });
    }),
    generateContentStream: vi.fn().mockImplementation(async function* () {
      if (shouldFail) {
        throw new Error(errorMessage);
      }
      yield { text: () => 'Mock ' };
      yield { text: () => 'stream ' };
      yield { text: () => 'response' };
    }),
  };
};

export const createMockGoogleGenerativeAI = (shouldFail = false, errorMessage = '') => {
  return {
    getGenerativeModel: vi.fn(() => createMockGenerativeModel(shouldFail, errorMessage)),
  };
};

export const mockApiResponses = {
  success: {
    response: {
      text: () => 'Success response',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: {
        promptTokenCount: 5,
        candidatesTokenCount: 15,
        totalTokenCount: 20,
      },
    },
  },
  rateLimitError: new Error('429 Rate limit exceeded'),
  authError: new Error('401 Invalid API key'),
  serverError: new Error('500 Internal server error'),
  timeoutError: new Error('Request timeout'),
  networkError: new Error('Network error: ECONNRESET'),
};
