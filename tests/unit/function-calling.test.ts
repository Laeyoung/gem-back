import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GemBack } from '../../src';
import type { FunctionDeclaration, ToolConfig } from '../../src/types/config';
import * as GoogleGenAI from '@google/genai';

// Mock @google/genai
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  const mockGenerateContentStream = vi.fn();
  const mockList = vi.fn();

  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
        list: mockList,
      },
    })),
    FunctionCallingConfigMode: {
      AUTO: 'AUTO',
      ANY: 'ANY',
      NONE: 'NONE',
    },
  };
});

describe('Function Calling', () => {
  let client: GemBack;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GemBack({ apiKey: 'test-key' });
  });

  const weatherFunction: FunctionDeclaration = {
    name: 'get_current_weather',
    description: 'Get the current weather in a given location',
    parameters: {
      type: 'object' as any,
      properties: {
        location: {
          type: 'string' as any,
          description: 'The city name, e.g. Tokyo, London',
        },
        unit: {
          type: 'string' as any,
          enum: ['celsius', 'fahrenheit'],
        },
      },
      required: ['location'],
    },
  };

  const calculatorFunction: FunctionDeclaration = {
    name: 'calculate',
    description: 'Perform basic arithmetic operations',
    parameters: {
      type: 'object' as any,
      properties: {
        operation: {
          type: 'string' as any,
          enum: ['add', 'subtract', 'multiply', 'divide'],
        },
        a: { type: 'number' as any },
        b: { type: 'number' as any },
      },
      required: ['operation', 'a', 'b'],
    },
  };

  const mockSuccessResponse = {
    text: 'I will check the weather for you.',
    model: 'gemini-3-flash-preview' as any,
    finishReason: 'STOP',
    usage: {
      promptTokens: 20,
      completionTokens: 10,
      totalTokens: 30,
    },
  };

  const mockFunctionCallResponse = {
    text: '',
    model: 'gemini-3-flash-preview' as any,
    finishReason: 'STOP',
    functionCalls: [
      {
        name: 'get_current_weather',
        args: { location: 'Tokyo', unit: 'celsius' },
      },
    ],
    usage: {
      promptTokens: 20,
      completionTokens: 5,
      totalTokens: 25,
    },
  };

  describe('generate', () => {
    it('should pass tools to SDK', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      await client.generate('What is the weather in Tokyo?', {
        tools: [weatherFunction],
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'What is the weather in Tokyo?',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction],
        })
      );
    });

    it('should pass multiple tools', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      await client.generate('Calculate 5 + 3 and tell me the weather', {
        tools: [weatherFunction, calculatorFunction],
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Calculate 5 + 3 and tell me the weather',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction, calculatorFunction],
        })
      );
    });

    it('should extract function calls from response', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockFunctionCallResponse);
      (client as any).client.generate = mockGenerate;

      const response = await client.generate('What is the weather in Tokyo?', {
        tools: [weatherFunction],
      });

      expect(response.functionCalls).toBeDefined();
      expect(response.functionCalls).toHaveLength(1);
      expect(response.functionCalls![0]).toEqual({
        name: 'get_current_weather',
        args: { location: 'Tokyo', unit: 'celsius' },
      });
    });

    it('should work without function calls in response', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const response = await client.generate('Hello', {
        tools: [weatherFunction],
      });

      expect(response.functionCalls).toBeUndefined();
      expect(response.text).toBe('I will check the weather for you.');
    });

    it('should work without tools (backward compatible)', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      await client.generate('Hello');

      expect(mockGenerate).toHaveBeenCalledWith(
        'Hello',
        'gemini-3-flash-preview',
        'test-key',
        undefined
      );
    });
  });

  describe('toolConfig', () => {
    it('should pass toolConfig with auto mode', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const toolConfig: ToolConfig = {
        functionCallingMode: 'auto',
      };

      await client.generate('Test', {
        tools: [weatherFunction],
        toolConfig,
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction],
          toolConfig,
        })
      );
    });

    it('should pass toolConfig with any mode', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const toolConfig: ToolConfig = {
        functionCallingMode: 'any',
      };

      await client.generate('Test', {
        tools: [weatherFunction],
        toolConfig,
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          toolConfig,
        })
      );
    });

    it('should pass toolConfig with none mode', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const toolConfig: ToolConfig = {
        functionCallingMode: 'none',
      };

      await client.generate('Test', {
        tools: [weatherFunction],
        toolConfig,
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          toolConfig,
        })
      );
    });

    it('should pass allowedFunctionNames', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      const toolConfig: ToolConfig = {
        functionCallingMode: 'any',
        allowedFunctionNames: ['get_current_weather'],
      };

      await client.generate('Test', {
        tools: [weatherFunction, calculatorFunction],
        toolConfig,
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction, calculatorFunction],
          toolConfig,
        })
      );
    });

    it('should combine toolConfig with other options', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      await client.generate('Test', {
        tools: [weatherFunction],
        toolConfig: { functionCallingMode: 'auto' },
        temperature: 0.7,
        systemInstruction: 'You are helpful',
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction],
          toolConfig: { functionCallingMode: 'auto' },
          temperature: 0.7,
          systemInstruction: 'You are helpful',
        })
      );
    });
  });

  describe('generateStream', () => {
    it('should pass tools in streaming mode', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            text: 'Checking ',
            candidates: [{ finishReason: null }],
          };
          yield {
            text: 'weather...',
            candidates: [{ finishReason: 'STOP' }],
          };
        },
      };

      const mockGenerateStream = vi.fn().mockReturnValue(mockStream);
      (client as any).client.generateStream = mockGenerateStream;

      const stream = client.generateStream('What is the weather?', {
        tools: [weatherFunction],
      });

      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(mockGenerateStream).toHaveBeenCalledWith(
        'What is the weather?',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction],
        })
      );
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should pass toolConfig in streaming mode', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'OK', candidates: [{ finishReason: 'STOP' }] };
        },
      };

      const mockGenerateStream = vi.fn().mockReturnValue(mockStream);
      (client as any).client.generateStream = mockGenerateStream;

      const stream = client.generateStream('Test', {
        tools: [weatherFunction],
        toolConfig: { functionCallingMode: 'auto' },
      });

      for await (const chunk of stream) {
        // consume stream
      }

      expect(mockGenerateStream).toHaveBeenCalledWith(
        'Test',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction],
          toolConfig: { functionCallingMode: 'auto' },
        })
      );
    });
  });

  describe('generateContent', () => {
    it('should pass tools in multimodal content', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generateContent = mockGenerateContent;

      const request = {
        contents: [
          {
            role: 'user' as const,
            parts: [{ text: 'What is the weather in Tokyo?' }],
          },
        ],
        tools: [weatherFunction],
      };

      await client.generateContent(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        request.contents,
        'gemini-3-flash-preview',
        expect.any(String),
        expect.objectContaining({
          tools: [weatherFunction],
        })
      );
    });

    it('should extract function calls from multimodal response', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue(mockFunctionCallResponse);
      (client as any).client.generateContent = mockGenerateContent;

      const request = {
        contents: [
          {
            role: 'user' as const,
            parts: [{ text: 'Weather in Tokyo?' }],
          },
        ],
        tools: [weatherFunction],
      };

      const response = await client.generateContent(request);

      expect(response.functionCalls).toBeDefined();
      expect(response.functionCalls).toHaveLength(1);
      expect(response.functionCalls![0].name).toBe('get_current_weather');
    });
  });

  describe('generateContentStream', () => {
    it('should pass tools in streaming multimodal', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { text: 'OK', candidates: [{ finishReason: 'STOP' }] };
        },
      };

      const mockGenerateContentStream = vi.fn().mockReturnValue(mockStream);
      (client as any).client.generateContentStream = mockGenerateContentStream;

      const request = {
        contents: [
          {
            role: 'user' as const,
            parts: [{ text: 'Test' }],
          },
        ],
        tools: [weatherFunction],
      };

      const stream = client.generateContentStream(request);
      for await (const chunk of stream) {
        // consume stream
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        request.contents,
        'gemini-3-flash-preview',
        expect.any(String),
        expect.objectContaining({
          tools: [weatherFunction],
        })
      );
    });
  });

  describe('Fallback behavior with function calling', () => {
    it('should maintain tools across fallback attempts', async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce({
          message: '429 Rate limit exceeded',
          status: 429,
        })
        .mockResolvedValueOnce(mockSuccessResponse);

      (client as any).client.generate = mockGenerate;

      const client2 = new GemBack({
        apiKey: 'test-key',
        fallbackOrder: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      });
      (client2 as any).client.generate = mockGenerate;

      const response = await client2.generate('Test', {
        tools: [weatherFunction],
        toolConfig: { functionCallingMode: 'auto' },
      });

      expect(response.text).toBe('I will check the weather for you.');
      expect(mockGenerate).toHaveBeenCalledTimes(2);

      // Both calls should have tools and toolConfig
      expect(mockGenerate).toHaveBeenNthCalledWith(
        1,
        'Test',
        'gemini-2.5-flash',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction],
          toolConfig: { functionCallingMode: 'auto' },
        })
      );
      expect(mockGenerate).toHaveBeenNthCalledWith(
        2,
        'Test',
        'gemini-2.5-flash-lite',
        'test-key',
        expect.objectContaining({
          tools: [weatherFunction],
          toolConfig: { functionCallingMode: 'auto' },
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty tools array', async () => {
      const mockGenerate = vi.fn().mockResolvedValue(mockSuccessResponse);
      (client as any).client.generate = mockGenerate;

      await client.generate('Test', { tools: [] });

      expect(mockGenerate).toHaveBeenCalledWith(
        'Test',
        'gemini-3-flash-preview',
        'test-key',
        expect.objectContaining({
          tools: [],
        })
      );
    });

    it('should handle response with multiple function calls', async () => {
      const multiCallResponse = {
        text: '',
        model: 'gemini-3-flash-preview' as any,
        finishReason: 'STOP',
        functionCalls: [
          {
            name: 'get_current_weather',
            args: { location: 'Tokyo' },
          },
          {
            name: 'calculate',
            args: { operation: 'add', a: 5, b: 3 },
          },
        ],
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30,
        },
      };

      const mockGenerate = vi.fn().mockResolvedValue(multiCallResponse);
      (client as any).client.generate = mockGenerate;

      const response = await client.generate('Test', {
        tools: [weatherFunction, calculatorFunction],
      });

      expect(response.functionCalls).toHaveLength(2);
      expect(response.functionCalls![0].name).toBe('get_current_weather');
      expect(response.functionCalls![1].name).toBe('calculate');
    });

    it('should handle function call with missing args', async () => {
      const responseWithoutArgs = {
        text: '',
        model: 'gemini-3-flash-preview' as any,
        finishReason: 'STOP',
        functionCalls: [
          {
            name: 'get_current_weather',
            args: {}, // Empty args object
          },
        ],
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
      };

      const mockGenerate = vi.fn().mockResolvedValue(responseWithoutArgs);
      (client as any).client.generate = mockGenerate;

      const response = await client.generate('Test', {
        tools: [weatherFunction],
      });

      expect(response.functionCalls).toHaveLength(1);
      expect(response.functionCalls![0].args).toEqual({});
    });
  });
});
