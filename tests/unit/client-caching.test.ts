import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../../src/client/GeminiClient';
import { GoogleGenAI } from '@google/genai';

// Mock the GoogleGenAI class
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: 'mock' }),
      },
    })),
  };
});

describe('GeminiClient Caching', () => {
  let client: GeminiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GeminiClient();
  });

  it('should reuse the same client instance for the same API key', async () => {
    const apiKey = 'test-key-1';
    
    // First call
    await client.generate('test', 'gemini-2.5-flash', apiKey);
    expect(GoogleGenAI).toHaveBeenCalledTimes(1);
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey });

    // Second call with same key
    await client.generate('test', 'gemini-2.5-flash', apiKey);
    expect(GoogleGenAI).toHaveBeenCalledTimes(1); // Should still be 1
  });

  it('should create new client instance for different API keys', async () => {
    const key1 = 'test-key-1';
    const key2 = 'test-key-2';

    // Call with key1
    await client.generate('test', 'gemini-2.5-flash', key1);
    expect(GoogleGenAI).toHaveBeenCalledTimes(1);
    expect(GoogleGenAI).toHaveBeenLastCalledWith({ apiKey: key1 });

    // Call with key2
    await client.generate('test', 'gemini-2.5-flash', key2);
    expect(GoogleGenAI).toHaveBeenCalledTimes(2);
    expect(GoogleGenAI).toHaveBeenLastCalledWith({ apiKey: key2 });

    // Call with key1 again (should be cached)
    await client.generate('test', 'gemini-2.5-flash', key1);
    expect(GoogleGenAI).toHaveBeenCalledTimes(2); // Should still be 2
  });

  it('should recreate client after clearCache() is called', async () => {
    const apiKey = 'test-key-1';

    // First call
    await client.generate('test', 'gemini-2.5-flash', apiKey);
    expect(GoogleGenAI).toHaveBeenCalledTimes(1);

    // Clear cache
    client.clearCache();

    // Second call with same key
    await client.generate('test', 'gemini-2.5-flash', apiKey);
    expect(GoogleGenAI).toHaveBeenCalledTimes(2); // Should be 2 now
  });

  it('should cache clients independently of models', async () => {
    const apiKey = 'test-key-1';

    // Call with model A
    await client.generate('test', 'gemini-2.5-flash', apiKey);
    expect(GoogleGenAI).toHaveBeenCalledTimes(1);

    // Call with model B, same key
    await client.generate('test', 'gemini-2.5-flash-lite', apiKey);
    expect(GoogleGenAI).toHaveBeenCalledTimes(1); // Should still be 1
  });
});
