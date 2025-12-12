# Staging Tests for SDK Migration

This directory contains staging tests for validating the SDK migration with real API calls.

## Prerequisites

You need a valid Google Gemini API key. Get one from:
https://aistudio.google.com/app/apikey

## Running the Tests

### Single API Key

```bash
GEMINI_API_KEY=your-api-key-here npm run test:staging
```

### Multiple API Keys (for testing multi-key rotation)

```bash
GEMINI_API_KEYS=key1,key2,key3 npm run test:staging
```

## What Gets Tested

The staging test validates the following functionality with real API calls:

### ✅ Core Functionality
1. **Basic Generation** - Simple text generation
2. **Streaming** - Streaming text generation
3. **Generation with Options** - Temperature, maxTokens, topP configuration
4. **Multimodal Content API** - Using `generateContent()` method
5. **Multimodal Streaming** - Using `generateContentStream()` method

### ✅ SDK Migration Specific
6. **Client Caching** - Verifies per-API-key client caching works
7. **Cache Clearing** - Tests `clearCache()` method
8. **Error Handling** - Invalid API key error handling

### ✅ Multi-Key Features (if multiple keys provided)
9. **Multi-Key Rotation** - Round-robin rotation across API keys

## Expected Output

```
🧪 SDK Migration Staging Tests
Using 1 API key

============================================================
Test 1: Basic Generation
============================================================
✓ Basic text generation (1234ms)

============================================================
Test 2: Streaming Generation
============================================================
✓ Streaming text generation (1567ms)
  Received 12 chunks

[... more tests ...]

============================================================
Test Summary
============================================================

Total Tests: 9
Passed: 9
Failed: 0
Total Duration: 12456ms (12.46s)
Success Rate: 100.0%

✅ All tests passed!
SDK migration is working correctly with real API calls.
```

## Rate Limiting

The test includes 1-second delays between requests to respect Gemini API rate limits (15 RPM on free tier).

## Troubleshooting

### 401 Authentication Error
- Check that your API key is valid
- Verify the API key has not expired
- Ensure you're using the correct key format

### 429 Rate Limit Error
- Wait a few minutes and try again
- Use multiple API keys with `GEMINI_API_KEYS` for higher throughput
- The test already includes rate-limit-friendly delays

### Network Errors
- Check your internet connection
- Verify you can access ai.google.dev
- Check if any firewall or proxy is blocking requests

## Post-Migration Validation

After running these tests successfully, you can be confident that:

✅ The new `@google/genai` SDK is working correctly
✅ Client caching is functioning as expected
✅ All API methods (generate, stream, multimodal) work properly
✅ Error handling remains intact
✅ Multi-key rotation (if tested) continues to work

## Next Steps

1. **Manual Testing**: Test your specific use cases with real data
2. **Performance Baseline**: Compare response times with previous version
3. **Monitor Production**: Watch for any edge cases in production traffic
4. **Review Logs**: Check for any unexpected warnings or errors

## Cleanup

The test does not create any persistent resources. All API calls are simple text generation requests that do not store data.
