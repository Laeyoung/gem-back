# TypeScript Integration Test

This directory contains integration tests for gemback in a TypeScript environment, verifying type safety and type inference.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install the local package:
```bash
npm install ../../gemback-0.2.0.tgz
```

3. Set your API key (optional for basic tests):
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

### Build only (to check TypeScript compilation):
```bash
npm run build
```

## What's Tested

### Type Safety
- ✅ Type imports (GemBack, GenerateResponse, etc.)
- ✅ Type-safe client options
- ✅ Type-safe method parameters
- ✅ Type-safe return values
- ✅ Type-safe error handling
- ✅ Type inference

### Functionality (with API key)
- ✅ Basic text generation
- ✅ Generation with options
- ✅ Streaming responses
- ✅ Chat interface
- ✅ Multi-key rotation
- ✅ Monitoring features
- ✅ Error handling

### Compile-time Guarantees
- ✅ Invalid options are caught at compile time
- ✅ Return types are properly inferred
- ✅ TypeScript strict mode compliance
- ✅ No type assertions needed
