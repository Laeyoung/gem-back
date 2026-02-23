# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gem Back** (`gemback` on npm) is a production-grade TypeScript library that provides intelligent fallback and monitoring for Google's Gemini API. It solves the problem of Gemini's strict RPM (Requests Per Minute) rate limits by implementing automatic model fallback and multi-API-key rotation.

- **Version**: 0.5.0
- **Author**: Laeyoung
- **License**: MIT
- **Repository**: https://github.com/Laeyoung/gem-back

### Core Problem Solved
The Gemini API free tier has strict RPM limits (as low as 5 RPM for some models), causing `429 Too Many Requests` errors in high-traffic scenarios. This library provides:
- Automatic fallback to alternate Gemini models when one hits rate limits
- Multi-key rotation to effectively bypass per-key RPM limits
- Real-time rate limit prediction and health monitoring
- Production-grade retry logic with exponential backoff
- Function calling, system instructions, safety settings, and JSON mode support

## Development Commands

### Building & Development
```bash
# Build the library (outputs to dist/)
npm run build

# Development mode with auto-rebuild
npm run dev

# Type checking (no output)
npm run typecheck
```

### Testing
```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run a single test file
npx vitest tests/unit/fallback.test.ts

# Run tests matching a pattern
npx vitest --grep "multi-key"

# Run staging tests (requires API key in .env.local)
npm run test:staging

# Run E2E integration tests (builds, packs, tests CJS/ESM/TS consumers)
npm run test:e2e
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changes
npm run format:check
```

### Model Management
```bash
# Fetch latest model list from Gemini API
npm run fetch-models

# Generate TypeScript types from fetched model data
npm run generate-models

# Full update workflow: fetch + generate + lint
npm run update-models
```

### Pre-publish Checks
```bash
# Runs build + tests (executed before npm publish)
npm run prepublishOnly
```

## Architecture

### Core Components

#### 1. Client Layer (`src/client/`)
- **`FallbackClient.ts`** - Main entry point (`GemBack` class)
  - Orchestrates fallback logic across multiple Gemini models
  - Manages API key rotation via `ApiKeyRotator`
  - Integrates monitoring systems (`RateLimitTracker`, `HealthMonitor`)
  - Handles five main operations: `generate()`, `generateStream()`, `chat()`, `generateContent()`, `generateContentStream()`
  - Each operation follows the same pattern: try each model in fallback order, retry with backoff, record metrics
  - `initialize()` method validates API key(s) before use
  - `getFallbackStats()` returns aggregated usage and monitoring data

- **`GeminiClient.ts`** - Direct Gemini SDK wrapper
  - Wrapper around `@google/genai` (the new Google GenAI SDK)
  - Per-API-key client caching via `Map<string, GoogleGenAI>` for performance
  - `clearCache()` method for manual cache invalidation
  - `validateApiKey()` for key verification via lightweight `ai.models.list()` call
  - Handles model initialization and all API calls
  - Supports function calling, system instructions, safety settings, JSON mode
  - No fallback logic (that's in FallbackClient)

#### 2. Configuration (`src/config/`)
- **`defaults.ts`** - Default client options
  - `DEFAULT_MAX_RETRIES`: 2
  - `DEFAULT_TIMEOUT`: 30000ms
  - `DEFAULT_RETRY_DELAY`: 1000ms
  - `DEFAULT_LOG_LEVEL`: 'error'
  - Default rotation strategy: 'round-robin'
  - Imports `DEFAULT_FALLBACK_ORDER` from `src/types/models.ts`

- **`models.ts`** - Auto-generated model metadata (DO NOT EDIT MANUALLY)
  - `MODEL_PRIORITY`: Numeric priority per model (lower = higher priority in fallback)
  - `MODEL_INFO`: Name, description, and maxTokens per model

#### 3. Monitoring System (`src/monitoring/`)
- **`rate-limit-tracker.ts`** - RPM tracking and prediction
  - Tracks request history per model (sliding 5-minute window)
  - Predicts rate limit violations before they happen (80% and 90% thresholds)
  - Provides recommended wait times
  - Key insight: Rate limits are tracked **per model**, not per API key (as per Gemini API design)
  - Default limits: 15 RPM, 1500 RPD per model (customizable)

- **`health-monitor.ts`** - Model health status
  - Tracks success rate, response time, availability per model
  - Calculates percentile metrics (p50, p95, p99)
  - Status classification: `healthy` | `degraded` | `unhealthy`
  - Consecutive failure tracking

- **`index.ts`** - Barrel exports for monitoring types and classes

#### 4. Utility Layer (`src/utils/`)
- **`api-key-rotator.ts`** - Multi-key management
  - Two strategies: `round-robin` (default) and `least-used`
  - Tracks per-key statistics (requests, success rate, last used)
  - **Important**: Multiple keys bypass RPM limits because Gemini enforces limits per API key

- **`retry.ts`** - Exponential backoff retry logic
  - Configurable max retries and initial delay
  - Custom `shouldRetry` callbacks for error classification
  - Used by FallbackClient for transient error handling

- **`error-handler.ts`** - Error classification utilities
  - Classifies errors: rate limit, auth, retryable, server errors
  - Extracts HTTP status codes from various error formats
  - `ErrorResponse` interface for JSON error parsing
  - Used to determine retry and fallback behavior

- **`logger.ts`** - Structured logging
  - Log levels: `debug | info | warn | error | silent`
  - Prefixed output for easy filtering

#### 5. Type System (`src/types/`)
- **`config.ts`** - Configuration and request types
  - `GemBackOptions` - Main client configuration
  - `GeminiBackClientOptions` - Deprecated alias for `GemBackOptions`
  - `GenerateOptions` - Per-request options (temperature, tokens, systemInstruction, tools, toolConfig, safetySettings, responseMimeType, responseSchema)
  - `GenerateContentRequest` - Multimodal request configuration
  - `Content` and `Part` - Multimodal input types (text, images, files)
  - `ChatMessage` - Chat conversation message
  - `ToolConfig` and `FunctionCallingMode` - Function calling configuration
  - Re-exports from `@google/genai`: `FunctionDeclaration`, `FunctionCall`, `FunctionResponse`, `SafetySetting`, `HarmCategory`, `HarmBlockThreshold`, `ResponseSchema`

- **`response.ts`** - Response and statistics types
  - `GeminiResponse` - Response wrapper with text, model, finishReason, functionCalls, json, and usage fields
  - `StreamChunk` - Streaming response chunks
  - `FallbackStats` - Usage statistics with monitoring data
  - `ApiKeyStats` - Per-key usage metrics

- **`errors.ts`** - Custom error types
  - `GeminiBackError` - Main error class with code, statusCode, modelAttempted, and allAttempts
  - `AttemptRecord` - Record of each failed attempt

- **`models.ts`** - Auto-generated model definitions (DO NOT EDIT MANUALLY)
  - `GeminiModel` - TypeScript union type of supported model identifiers
  - `DEFAULT_FALLBACK_ORDER` - Default model fallback chain
  - `ALL_MODELS` - Complete list of all supported models
  - Currently supported (as of v0.5.0):
    - `gemini-2.5-flash` (stable)
    - `gemini-2.5-pro` (stable)
    - `gemini-2.5-flash-lite` (stable)
    - `gemini-2.0-flash` (stable)
    - `gemini-2.0-flash-lite` (stable)
    - `gemini-3-flash-preview` (preview)
    - `gemini-3-pro-preview` (preview)
  - Default fallback order: `gemini-3-flash-preview` -> `gemini-2.5-flash` -> `gemini-2.5-flash-lite`

### Key Architectural Patterns

1. **Fallback Chain Pattern**
   - Each request tries models in order from `fallbackOrder` config
   - On failure, moves to next model automatically
   - Auth errors (401/403) immediately stop the chain (no fallback)
   - Rate limit errors (429) trigger immediate fallback (no retry)
   - Server errors (5xx) trigger retry with backoff, then fallback

2. **Monitoring Integration**
   - Monitoring systems are optional (`enableMonitoring` flag)
   - Rate limit tracking happens before requests (prediction)
   - Health monitoring records after requests (response time, success)
   - Statistics aggregated in `getFallbackStats()` method

3. **API Key Rotation**
   - Single key mode: uses `options.apiKey` directly
   - Multi-key mode: `ApiKeyRotator` selects next key before each request
   - Rate limits tracked per model, not per key (Gemini API design)
   - Key statistics help identify problematic keys

4. **Error Handling Strategy**
   - **Non-retryable**: Auth errors (4xx except 429) - immediate failure
   - **No retry, immediate fallback**: Rate limits (429)
   - **Retry then fallback**: Server errors (5xx), timeouts, network errors
   - All attempts recorded in `GeminiBackError.allAttempts` for debugging

5. **Client Caching**
   - `GoogleGenAI` instances cached per API key in `GeminiClient`
   - ~5-10ms performance improvement per request on cached clients
   - `clearCache()` available for manual invalidation

6. **Auto-Generated Model Definitions**
   - `src/types/models.ts` and `src/config/models.ts` are auto-generated by `scripts/generate-models.ts`
   - Source data fetched from Gemini API by `scripts/fetch-models.ts`
   - Do NOT edit these files manually; use `npm run update-models`

## Testing Strategy

### Test Structure
- **Unit tests** (`tests/unit/`) - Test individual components in isolation
- **Integration tests** (`tests/integration/`) - Test component interactions
- **Staging tests** (`tests/staging/`) - SDK migration/validation tests (requires API key)
- **E2E tests** (`test-integration/`) - End-to-end consumer tests (CJS, ESM, TypeScript)
- **Mocks** (`tests/mocks/`) - Mock Gemini API responses

### Key Test Files
- `fallback.test.ts` - Core fallback logic (must test all fallback scenarios)
- `client.test.ts` - GeminiClient unit tests
- `client-caching.test.ts` - Client caching behavior
- `multi-key-integration.test.ts` - API key rotation behavior
- `monitoring-integration.test.ts` - Rate limit and health monitoring
- `rate-limit-tracker.test.ts` - Rate limiting prediction logic
- `health-monitor.test.ts` - Health status classification
- `function-calling.test.ts` - Function calling / tool use (19 tests)
- `system-instructions.test.ts` - System instruction support (11 tests)
- `safety-settings.test.ts` - Safety settings and fallback (10 tests)
- `json-mode.test.ts` - JSON mode and structured outputs (15 tests)
- `models.test.ts` - Model definitions and constants
- `api-key-rotator.test.ts` - Key rotation strategies
- `error-handler.test.ts` - Error classification
- `logger.test.ts` - Logging behavior
- `retry.test.ts` - Retry logic

### Testing Stats
- **235 tests** across **17 test files** (as of v0.5.0)
- Coverage target: >85% (per CONTRIBUTING.md), core library >90%
- GeminiClient coverage: ~97%

### Testing Philosophy
- Maintain >85% coverage (per CONTRIBUTING.md)
- Use arrange-act-assert pattern
- Mock external API calls (never hit real Gemini API in unit/integration tests)
- Test error paths thoroughly (fallback is all about error handling)
- Use vitest with globals enabled (no need to import describe/it/expect)

### E2E Integration Tests (`test-integration/`)
Tests the library as a consumer would use it across different module systems:
- `commonjs-test/` - CommonJS (`require`) consumer
- `esm-test/` - ES Module (`import`) consumer
- `typescript-test/` - TypeScript consumer
- `run-all-tests.sh` - Script that builds, packs, and runs all E2E tests

## CI/CD

### GitHub Actions Workflows
- **`test.yml`** - Runs unit tests and E2E tests on PRs to develop/master
  - Node.js 18, npm ci, unit tests, build + pack, E2E tests
- **`test-pr.yml`** - Runs tests on PRs to main/develop, posts results as PR comments
  - Node.js 20, test output captured and posted as PR comment
- **`update-projects-showcase.yml`** - Weekly automated showcase updates

## Important Constraints & Design Decisions

### SDK Dependency
- Uses `@google/genai` v1.33.0+ (NOT the older `@google/generative-ai`)
- API calls go through `ai.models.generateContent()` and `ai.models.generateContentStream()`
- Response text accessed via `result.text` (property, not method)
- Streaming uses direct async iteration (no `.stream` property)

### Rate Limiting Design
- **Rate limits are per-model, not per-API-key**: This is how Gemini API works
- Default limits: 15 RPM, 1500 RPD per model (customizable via `RateLimitTracker` constructor)
- Multi-key rotation helps because each key has separate rate limits
- Tracking uses sliding 5-minute window for trend analysis

### Model Support
- 7 models currently supported (as of v0.5.0), including 2 preview models
- Models auto-generated from Gemini API; run `npm run update-models` to refresh
- Default fallback order defined in `src/types/models.ts`
- Preview models (gemini-3-*) included in default fallback but marked with warnings

### Streaming Behavior
- Streaming uses async generators (`AsyncGenerator<StreamChunk>`)
- Must yield at least once for success to be recorded
- Completion chunk has `isComplete: true` flag
- Error handling follows same fallback pattern as regular requests

### Multimodal Support
- Supports text, inline images (base64), and file URIs
- Uses `Content` and `Part` types
- Same fallback and retry logic applies
- Both `generateContent()` and `generateContentStream()` support multimodal

### Function Calling
- Full function calling support via `tools` and `toolConfig` in GenerateOptions
- `FunctionDeclaration`, `FunctionCall`, `FunctionResponse` types re-exported from `@google/genai`
- `FunctionCallingMode`: `'auto'` | `'any'` | `'none'`
- Function calls returned in `GeminiResponse.functionCalls`
- Works across all generation methods

### Safety Settings
- Full safety API: `HarmCategory`, `HarmBlockThreshold`, `SafetySetting`
- Settings preserved across fallback attempts
- Empty array support for "no restrictions" mode

### JSON Mode
- `responseMimeType: 'application/json'` forces JSON output
- Optional `responseSchema` for schema validation
- Automatic JSON parsing into `GeminiResponse.json` field
- Graceful fallback on parse failure (keeps text, logs warning)

## Common Development Scenarios

### Adding a New Gemini Model
1. Run `npm run update-models` to auto-fetch and generate (preferred)
2. OR manually update `src/types/models.ts` (`GeminiModel` type, `DEFAULT_FALLBACK_ORDER`, `ALL_MODELS`)
3. AND manually update `src/config/models.ts` (`MODEL_PRIORITY`, `MODEL_INFO`)
4. Update monitoring default limits if model has different RPM limits
5. Update README.md supported models section
6. Add tests for new model

### Modifying Fallback Logic
- Main logic in `FallbackClient.ts` `generate()` method
- Must update all 5 methods: `generate()`, `generateStream()`, `chat()`, `generateContent()`, `generateContentStream()`
- Ensure error classification in `error-handler.ts` is correct
- Add tests for new fallback scenarios

### Changing Rate Limit Behavior
- Default limits constructed dynamically from `ALL_MODELS` in `rate-limit-tracker.ts`
- Thresholds: `warningThreshold` (80%), `predictionThreshold` (90%)
- Ensure predictions don't cause false positives
- Update monitoring integration tests

## Scripts (`scripts/`)

- **`fetch-models.ts`** - Fetches model list from Gemini API (`v1beta/models`), with smart filtering and caching
- **`generate-models.ts`** - Generates `src/types/models.ts` and `src/config/models.ts` from fetched data
- **`update-showcase.ts`** - Finds GitHub projects using gemback and updates README showcase
- **`github-api.ts`** - GitHub API client with rate limiting
- **`project-finder.ts`** - Project search and ranking for showcase
- **`readme-updater.ts`** - Safe README manipulation with marker-based updates
- **`types.ts`** - TypeScript interfaces for showcase system

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Update `RELEASE_NOTE.md` (and `RELEASE_NOTE.ko.md` for Korean)
4. Run `npm run prepublishOnly` (builds + tests)
5. Commit changes following conventional commits format
6. Create git tag: `git tag v0.x.x`
7. Push with tags: `git push origin main --tags`
8. `npm publish` (must pass all checks)

## TypeScript Configuration

- **Target**: ES2020
- **Strict mode**: Enabled (all strict flags on)
- **Module system**: ESNext (compiled to both CJS and ESM by tsup)
- **Module resolution**: node
- **Output**: `dist/` with declaration maps and source maps
- `noUnusedLocals` and `noUnusedParameters`: disabled (set to false)
- `noImplicitReturns`: enabled
- `noFallthroughCasesInSwitch`: enabled
- `resolveJsonModule`: enabled
- Excludes: `node_modules`, `dist`, `**/*.test.ts`, `**/*.spec.ts`

## Build System

- **Bundler**: tsup (esbuild-based)
- **Outputs**:
  - `dist/index.js` (CommonJS)
  - `dist/index.mjs` (ES Module)
  - `dist/index.d.ts` (TypeScript declarations)
- Clean build on each run (removes old dist/)
- Build command: `tsup src/index.ts --format cjs,esm --dts --clean`

## Dependencies

### Runtime
- `@google/genai` ^1.33.0 - Google GenAI SDK (the new SDK, not `@google/generative-ai`)

### Dev
- `vitest` ^1.2.0 - Test runner
- `@vitest/coverage-v8` ^1.2.0 - Coverage provider
- `tsup` ^8.0.0 - Bundler
- `tsx` ^4.21.0 - TypeScript execution for scripts
- `typescript` ^5.3.0 - TypeScript compiler
- `eslint` ^8.56.0 with `@typescript-eslint/*` ^7.0.0 - Linting
- `prettier` ^3.2.0 - Formatting
- `@octokit/rest` ^20.0.0 - GitHub API (for showcase scripts)
- `dotenv-cli` ^11.0.0 - Environment variable loading for E2E tests

### Node.js Requirement
- `>=18.0.0`
