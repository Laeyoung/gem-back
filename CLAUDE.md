# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gem Back** is a production-grade TypeScript library that provides intelligent fallback and monitoring for Google's Gemini API. It solves the problem of Gemini's strict RPM (Requests Per Minute) rate limits by implementing automatic model fallback and multi-API-key rotation.

### Core Problem Solved
The Gemini API free tier has a 15 RPM limit, causing `429 Too Many Requests` errors in high-traffic scenarios. This library provides:
- Automatic fallback to alternate Gemini models when one hits rate limits
- Multi-key rotation to effectively bypass per-key RPM limits
- Real-time rate limit prediction and health monitoring
- Production-grade retry logic with exponential backoff

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

# Staging migration test (hits real SDK, needs .env)
npm run test:staging

# Full end-to-end integration test (builds, packs, installs the tarball, runs scenarios)
npm run test:e2e
```

### Model Metadata Generation
The Gemini model list under `src/types/models.ts` and `src/config/models.ts` is **auto-generated**. Do not hand-edit these files — regenerate them instead.
```bash
# Fetch current models from Gemini API v1beta/models → scripts/models-data.json
npm run fetch-models

# Regenerate src/types/models.ts + src/config/models.ts from models-data.json
npm run generate-models

# Convenience: fetch + generate + lint-fix
npm run update-models
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
  - Handles four main operations: `generate()`, `generateStream()`, `chat()`, `generateContent()`
  - Each operation follows the same pattern: try each model in fallback order, retry with backoff, record metrics

- **`GeminiClient.ts`** - Direct Gemini SDK wrapper
  - Thin wrapper around `@google/genai`
  - Handles model initialization and basic API calls
  - No fallback logic (that's in FallbackClient)

#### 2. Monitoring System (`src/monitoring/`)
- **`rate-limit-tracker.ts`** - RPM tracking and prediction
  - Tracks request history per model (sliding 5-minute window)
  - Predicts rate limit violations before they happen (80% and 90% thresholds)
  - Provides recommended wait times
  - Key insight: Rate limits are tracked **per model**, not per API key (as per Gemini API design)

- **`health-monitor.ts`** - Model health status
  - Tracks success rate, response time, availability per model
  - Calculates percentile metrics (p50, p95, p99)
  - Status classification: `healthy` | `degraded` | `unhealthy`
  - Consecutive failure tracking

#### 3. Utility Layer (`src/utils/`)
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
  - Used to determine retry and fallback behavior

- **`logger.ts`** - Structured logging
  - Log levels: `debug | info | warn | error | silent`
  - Prefixed output for easy filtering

#### 4. Type System (`src/types/`)
- **`config.ts`** - Configuration types
  - `GemBackOptions` - Main client configuration
  - `GenerateOptions` - Per-request options (temperature, tokens, etc.)
  - `Content` and `Part` - Multimodal input types (text, images, files)

- **`response.ts`** - Response and statistics types
  - `GeminiResponse` - Text response wrapper
  - `StreamChunk` - Streaming response chunks
  - `FallbackStats` - Usage statistics with monitoring data
  - `ApiKeyStats` - Per-key usage metrics

- **`errors.ts`** - Custom error types
  - `GeminiBackError` - Main error class with attempt records

- **`models.ts`** - **AUTO-GENERATED** `GeminiModel` type, `ALL_MODELS`, and `DEFAULT_FALLBACK_ORDER`. Regenerate via `npm run update-models`; do not hand-edit.

#### 5. Config Layer (`src/config/`)
- **`models.ts`** - **AUTO-GENERATED** model metadata (priority, capabilities) sourced from the Gemini API. Regenerate via `npm run update-models`.
- **`deprecated.ts`** - Hand-maintained `DEPRECATED_MODELS` map (shutdown dates, replacement, structured `reason`) and `REMOVED_MODELS` list (IDs removed from the upstream API — `FallbackClient` skips the SDK call entirely for these and records `AttemptRecord.reason = 'removed_from_api'`). Drives runtime deprecation warnings.
- **`defaults.ts`** - Default configuration values used by `FallbackClient` when options are omitted.

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

## Testing Strategy

### Test Structure
- **Unit tests** (`tests/unit/`) - Test individual components in isolation
- **Integration tests** (`tests/integration/`) - Test component interactions
- **Mocks** (`tests/mocks/`) - Mock Gemini API responses

### Key Test Files
- `fallback.test.ts` - Core fallback logic (must test all fallback scenarios)
- `multi-key-integration.test.ts` - API key rotation behavior
- `monitoring-integration.test.ts` - Rate limit and health monitoring
- `rate-limit-tracker.test.ts` - Rate limiting prediction logic
- `health-monitor.test.ts` - Health status classification

### Testing Philosophy
- Maintain >85% coverage (per CONTRIBUTING.md)
- Use arrange-act-assert pattern
- Mock external API calls (never hit real Gemini API in tests)
- Test error paths thoroughly (fallback is all about error handling)

## Important Constraints & Design Decisions

### Rate Limiting Design
- **Rate limits are per-model, not per-API-key**: This is how Gemini API works
- Default limits: 15 RPM, 1500 RPD per model
- Multi-key rotation helps because each key has separate rate limits
- Tracking uses sliding 5-minute window for trend analysis

### Model Support
- Model list is auto-generated from the Gemini API — `src/types/models.ts` and `src/config/models.ts` are both regenerated by `npm run update-models`.
- `DEFAULT_FALLBACK_ORDER` (in `src/types/models.ts`) intentionally includes preview models because all current "stable" models have deprecation dates scheduled. Production callers should pass an explicit `fallbackOrder`.
- Deprecation metadata (shutdown date, replacement, runtime warning copy) lives in the hand-maintained `src/config/deprecated.ts`.

### Streaming Behavior
- Streaming uses async generators (`AsyncGenerator<StreamChunk>`)
- Must yield at least once for success to be recorded
- Completion chunk has `isComplete: true` flag
- Error handling follows same fallback pattern as regular requests

### Multimodal Support
- Supports text, inline images (base64), and file URIs
- Uses `Content` and `Part` types from Gemini SDK
- Same fallback and retry logic applies

## Common Development Scenarios

### Adding a New Gemini Model
The model list is regenerated from the live Gemini API, not hand-edited.
1. Run `npm run update-models` (fetches `v1beta/models`, regenerates `src/types/models.ts` + `src/config/models.ts`, runs `lint:fix`).
2. If the new model has free-tier quota, add an entry to `FREE_TIER_LIMITS` in `src/config/free-tier-limits.ts` (RPM/TPM/RPD). Paid-only models don't need an entry — they fall back to `{ rpm: 15, rpd: 1500 }` automatically; add the model ID to `NON_FREE_TIER_MODELS` in the same file so callers get the runtime warn.
3. If the API returns a specialized variant (e.g. `*-tts-*`, `*-customtools`), confirm `EXCLUDED_VARIANT_PATTERN` in `scripts/generate-models.ts` already excludes it; otherwise extend the pattern. For models that should be skipped despite matching no pattern, add to `MANUAL_EXCLUDES`.
4. If you want it in the default fallback chain, edit the `targetFallbackOrder` block inside the model generator (`scripts/generate-models.ts`) — editing the auto-generated output directly will be overwritten on the next regen.
5. Update README.md (and README.ko.md) supported models section.
6. Add tests for new model.

### Modifying Fallback Logic
- Main logic in `FallbackClient.ts` `generate()` method
- Must update all 4 methods: `generate()`, `generateStream()`, `chat()`, `generateContent()`
- Ensure error classification in `error-handler.ts` is correct
- Add tests for new fallback scenarios

### Changing Rate Limit Behavior
- Configuration in `rate-limit-tracker.ts` default limits
- Thresholds: `warningThreshold` (80%), `predictionThreshold` (90%)
- Ensure predictions don't cause false positives
- Update monitoring integration tests

## Parallel Agent Context
A `GEMINI.md` file mirrors this CLAUDE.md for the Gemini CLI. When making non-trivial architectural updates here, mirror the change there to keep both agents aligned.

## Development Progress Tracking

개발 진행 현황은 `docs/DEV_PROGRESS.md`에서 관리합니다.

### 규칙
- 각 작업 항목을 시작할 때 상태를 `🔧 진행 중`으로 업데이트
- 작업 완료 시 `✅ 완료`로 업데이트
- 검증 단계(typecheck, test, lint) 통과 여부도 반드시 기록
- 차단 사항이 있으면 `❌ 차단됨`으로 표시하고 비고에 사유 작성
- 이어서 작업하는 개발자가 현재 진행 상태를 즉시 파악할 수 있도록 항상 최신 상태 유지

## Development Log

개발 중 주요 내용과 기술적 결정 사항은 `docs/DEV_LOG.md`에 기록합니다.

### 규칙
- 최신 항목이 파일 상단에 위치 (역순 정렬)
- 각 항목에 날짜와 대략적인 시각 기재 (예: `2026-03-14 ~15:00`)
- Phase 진행 시 작업 내용, 기술적 결정, 검토했던 대안을 함께 기록
- 기술적 결정에는 반드시 "검토한 대안"과 "결정 이유"를 포함
- 검증 실패나 예상치 못한 이슈가 발생한 경우 원인과 해결 과정도 기록

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Run `npm run prepublishOnly` (builds + tests)
4. Commit changes following conventional commits format
5. Create git tag: `git tag v0.x.x`
6. Push with tags: `git push origin main --tags`
7. `npm publish` (must pass all checks)

## TypeScript Configuration

- **Target**: ES2020
- **Strict mode**: Enabled (all strict flags on)
- **Module system**: ESNext (compiled to both CJS and ESM by tsup)
- **Output**: `dist/` with declaration maps
- Do not use `noUnusedLocals` or `noUnusedParameters` (disabled in tsconfig.json)

## Build System

- **Bundler**: tsup (esbuild-based)
- **Outputs**:
  - `dist/index.js` (CommonJS)
  - `dist/index.mjs` (ES Module)
  - `dist/index.d.ts` (TypeScript declarations)
- Clean build on each run (removes old dist/)
