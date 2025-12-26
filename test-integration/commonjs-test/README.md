# CommonJS Integration Test

This directory contains integration tests for gemback in a CommonJS environment.

## Setup

1. Install the local package:
```bash
npm install ../../gemback-0.4.0.tgz
```

2. Set your API key (optional for basic tests):
```bash
export GEMINI_API_KEY=your_api_key_here
```

## Running Tests

### Basic test (works without API key):
```bash
npm test
```

### Comprehensive test (requires API key):
```bash
npm run test:all
```

## What's Tested

- ✅ CommonJS module loading
- ✅ Client instantiation
- ✅ Type checking
- ✅ Basic text generation (with API key)
- ✅ Streaming responses (with API key)
- ✅ Chat interface (with API key)
- ✅ Multimodal support (with API key)
- ✅ Multi-key rotation (with API key)
- ✅ Monitoring features (with API key)
- ✅ Error handling
- ✅ Fallback behavior (with API key)
- ✅ Statistics retrieval
