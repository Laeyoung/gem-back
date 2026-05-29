# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **`generateContentStream` now forwards `responseMimeType` and `responseSchema`** to the underlying SDK call. Previously these options on `GenerateContentRequest` were silently dropped on the streaming multimodal path (pre-existing in master), so JSON-mode streaming requests fell back to plain-text output. The non-streaming `generateContent` was already correct.

## [0.7.0] - 2026-05-29

### BREAKING CHANGES

- **`DeprecatedModelInfo.reason` narrowed** from `string` to a string-literal union `DeprecationReason = 'replaced_by_newer' | 'removed_from_api' | 'tier_change'`. Downstream callers reading `reason` as a free-form string must switch to the union. Existing prose strings on the 5 v0.6.0 entries were moved to the new optional `notes` field; the `reason` field now uses `'replaced_by_newer'` for all of them.
- **`DEFAULT_FALLBACK_ORDER` reshuffled to a free-tier-friendly composition** (RPD-first):
  `gemini-3.1-flash-lite` (stable, 500 RPD) → `gemini-3.5-flash` (top quality, 20 RPD) → `gemini-3-flash-preview` (backup, 20 RPD).
  Callers relying on the prior order should pass an explicit `fallbackOrder`.

### Added

- **`gemini-3.5-flash`** (new free-tier model: 5 RPM / 250K TPM / 20 RPD).
- **`gemini-3.1-flash-lite`** stable (free-tier: 15 RPM / 250K TPM / 500 RPD). Preview variant deprecated in favor of stable.
- **`FREE_TIER_LIMITS` and `NON_FREE_TIER_MODELS`** exports in `src/config/free-tier-limits.ts` — per-model quota source of truth.
- **`RateLimitTracker` per-model defaults**: `defaultLimits` now seeded from `FREE_TIER_LIMITS` for free-tier models; paid-tier models keep the conservative `{ rpm: 15, rpd: 1500 }` fallback (no TPM tracking).
- **TPM tracking** in `RateLimitTracker`:
  - `RateLimitConfig.tpm?: number`
  - `recordTokens(model, tokens, apiKeyIndex?)` separate method (called after the SDK response resolves)
  - `RateLimitStatus.currentTPM`, `maxTPM`, `tpmUtilizationPercent` (undefined for paid-tier models)
  - `willExceedSoon` now considers RPM and TPM, whichever is closer to its limit
- **Paid-tier runtime warning**: `FallbackClient` emits a one-time `logger.warn` when a model in `NON_FREE_TIER_MODELS` is invoked, so free-tier API key users understand why they see 4xx.
- **`AttemptRecord.reason?: DeprecationReason`** field — set when the call was skipped without invoking the SDK (e.g., for `removed_from_api`).
- **`DeprecationReason`** type exported from `src/index.ts`.
- **`REMOVED_MODELS`** export (`src/config/deprecated.ts`) — empty by default; populated when `npm run fetch-models` detects upstream model removal. `FallbackClient` now skips the SDK call entirely for any model in this list and records `AttemptRecord.reason = 'removed_from_api'`.
- **`RateLimitConfig`** type now exported from the package root — required to type entries in `customRateLimits`.
- **`customRateLimits`** option on `GemBackOptions` — per-model RPM/TPM/RPD overrides, merged per-field on top of `FREE_TIER_LIMITS` defaults. Only consulted when `enableMonitoring: true`; supplying it with monitoring off now emits a one-time `logger.warn`.

### Changed

- `scripts/generate-models.ts` now filters out specialized variants (`*-tts-*`, `*-customtools`) and manually-deprecated entries (`gemini-3-pro-preview`) before generating `ALL_MODELS`.
- `scripts/generate-models.ts` `targetFallbackOrder` updated to match the new free-tier composition.
- Deprecation table updated: previously `replacement: gemini-3.1-flash-lite-preview` entries now point at the stable `gemini-3.1-flash-lite`.
- **`gemini-3.1-flash-lite-preview` added to `DEPRECATED_MODELS`** (shutdownDate `2026-05-29`, replacement `gemini-3.1-flash-lite`, reason `replaced_by_newer`). Runtime deprecation warning now fires when this preview model is used; callers should migrate to the stable variant.

### Migration

See README "Migrating from v0.6 to v0.7" for code examples. Most call sites need no change; the breaking surfaces are `DeprecatedModelInfo.reason` consumers and callers that depend on the exact `DEFAULT_FALLBACK_ORDER` sequence.

## [0.6.0] - 2026-03-14

### Added

- **Deprecation Warning System**: Automatic warnings when using models scheduled for shutdown
  - `DEPRECATED_MODELS` constant exported for programmatic access
  - `DeprecatedModelInfo` type for type-safe deprecation metadata
  - Constructor warns when `fallbackOrder` contains deprecated models
  - Per-request warnings when `options.model` specifies a deprecated model (once per model)

- **New Model Support**:
  - `gemini-3.1-pro-preview` - Advanced intelligence, replaces `gemini-3-pro-preview`
  - `gemini-3.1-flash-lite-preview` - Most cost-efficient preview model

### Changed

- **Default Fallback Order**: `gemini-2.5-flash-lite` replaced by `gemini-3.1-flash-lite-preview` as 3rd fallback
  - New order: `gemini-3-flash-preview` -> `gemini-2.5-flash` -> `gemini-3.1-flash-lite-preview`
- Updated `MODEL_PRIORITY` and `MODEL_INFO` for new models
- Fixed `extractVersion()` regex in `generate-models.ts` to handle major-only versions (e.g., `gemini-3-flash-preview`)
- Fixed `fetch-models.ts` filtering to include all models within the latest major version

### Breaking Changes

- **`gemini-3-pro-preview` removed**: This model was shut down on 2026-03-09. Replace with `gemini-3.1-pro-preview`.
- **Default fallback order changed**: 3rd model is now `gemini-3.1-flash-lite-preview` instead of `gemini-2.5-flash-lite`.

### Migration from v0.5.x

1. **`gemini-3-pro-preview` users**: Replace with `gemini-3.1-pro-preview` in your `fallbackOrder`.
2. **Default fallback users**: 3rd fallback changed. Set explicit `fallbackOrder` to keep old behavior.
3. **Deprecation warnings**: Set `logLevel: 'warn'` to see deprecation warnings (default `logLevel` is `'error'`).

## [0.5.0] - 2026-01-01

### Added

#### 🎯 Function Calling / Tool Use

**Production-grade function calling support** enabling AI agents, workflows, and structured interactions.

- **Type Support**: Complete TypeScript types from `@google/genai` SDK
  - `FunctionDeclaration`: Define callable functions with JSON schema
  - `FunctionCall`: Represents AI's function invocation with arguments
  - `FunctionResponse`: Return function execution results to AI
  - `ToolConfig`: Configure function calling behavior (`auto`, `any`, `none`)

- **Integration**: Seamless function calling across all generation methods
  - `generate()`: Single-turn function calling
  - `generateStream()`: Streaming with function calls
  - `generateContent()`: Multimodal content with function calls
  - `generateContentStream()`: Streaming multimodal with function calls

- **Examples**: Complete working examples in `examples/function-calling.ts`
  - Weather lookup demonstration
  - Calculator functions
  - Multi-step function orchestration

#### 📝 System Instructions

**Persistent context and behavior control** for consistent AI responses.

- **Flexible Input**: Accepts both string and structured `Content` types
  - Simple string: `systemInstruction: "You are a helpful assistant"`
  - Structured: `systemInstruction: { role: 'user', parts: [{ text: '...' }] }`

- **Universal Support**: Works across all generation methods
  - Maintained across fallback attempts (consistent behavior)
  - Combined with other options (tools, safety settings, etc.)

- **Use Cases**:
  - Role definition and persona setting
  - Output format specification
  - Behavioral constraints and guidelines

#### 🛡️ Safety Settings

**Production-compliant content safety controls** with automatic fallback on safety blocks.

- **Complete Safety API**: Full support for Gemini's harm categories
  - `HarmCategory`: Harassment, hate speech, sexually explicit, dangerous content
  - `HarmBlockThreshold`: Block none, low and above, medium and above, only high
  - `SafetySetting[]`: Array of category-specific safety rules

- **Smart Fallback**: Automatic model switching on safety blocks
  - Safety settings preserved across fallback attempts
  - Logging and tracking of safety-related failures
  - Health monitoring integration for safety block rates

- **Production Ready**:
  - Combine multiple safety settings for fine-grained control
  - Empty array support for explicit "no restrictions" mode
  - Backward compatible (works without safety settings)

#### 🎨 JSON Mode (Structured Outputs)

**Reliable structured data extraction** eliminating JSON parsing errors.

- **Guaranteed JSON**: Force AI to output valid JSON
  - `responseMimeType: 'application/json'`: Enable JSON mode
  - `responseSchema`: Optional JSON schema for validation
  - Automatic JSON parsing with `response.json` field

- **Robust Parsing**:
  - Handles all JSON types (objects, arrays, primitives, null)
  - Graceful fallback on invalid JSON (keeps text, logs warning)
  - Empty text handling (returns undefined for json field)

- **Schema Support**: OpenAPI 3.0-style JSON schema
  - Type definitions (`object`, `string`, `number`, `boolean`, `array`)
  - Required fields and property constraints
  - Nested object and array schemas

- **Use Cases**:
  - API response formatting
  - Data extraction from unstructured text
  - Structured form filling
  - Database record generation

### Changed

#### 🔧 Code Quality Improvements

**Enhanced type safety** with proper TypeScript patterns:

- **Type Guards**: Added `hasFunctionCall()` type guard in `GeminiClient.ts`
  - Eliminates unsafe `any` type usage
  - Provides compile-time and runtime type safety
  - Used for function call extraction from SDK responses

- **Error Handling**: Improved `error-handler.ts` with explicit types
  - Added `ErrorResponse` interface for JSON error parsing
  - Removed unsafe type assertions
  - Better null/undefined handling with optional chaining

- **ESLint Clean**: All linting errors resolved (20 errors → 0 errors)
  - No `@typescript-eslint/no-explicit-any` warnings
  - No unsafe member access or assignments
  - Full compliance with strict TypeScript rules

### Tests

**Comprehensive test coverage** for all new features:

- `tests/unit/function-calling.test.ts`: 19 tests covering all scenarios (tools, toolConfig, streaming, fallback, edge cases)
- `tests/unit/system-instructions.test.ts`: 11 tests covering all use cases
- `tests/unit/safety-settings.test.ts`: 10 tests including fallback behavior
- `tests/unit/json-mode.test.ts`: 15 tests for JSON parsing edge cases

**Overall**: 235 tests passing across 17 test files

## [0.4.0] - 2025-12-27

### Added

#### 🤖 Model Auto-Update System

**Automated model list management** to keep the library current with Google's Gemini API updates.

- **Model Fetcher Script** (`scripts/fetch-models.ts`):
  - Fetches available models from Gemini API endpoint (`v1beta/models`)
  - **Smart version detection**: Automatically detects latest major version (e.g., Gemini 3.0) and includes its preview/experimental variants
  - **Advanced filtering**: Automatically excludes aliases (`-latest`), snapshots (`-001`), date-based versions (`-09-2025`), and embedding models
  - Supports `--all` flag to bypass filters and fetch everything
  - Retry logic with exponential backoff for API failures
  - Caching system for fallback during API outages

- **Code Generator Script** (`scripts/generate-models.ts`):
  - Generates TypeScript union types from API data
  - Classifies models: `stable`, `preview`, `experimental`
  - Smart priority calculation (Gemini 3 = 0, 2.5 = 100, 2.0 = 200+)
  - Auto-generates model metadata and rate limit defaults
  - Change detection to avoid unnecessary updates

- **New npm Scripts**:
  ```bash
  npm run fetch-models      # Fetch latest models from Gemini API
  npm run generate-models   # Generate TypeScript code from fetched data
  npm run update-models     # Complete update workflow (fetch + generate + lint)
  ```

- **ALL_MODELS Constant**:
  - New export in `src/types/models.ts`
  - Single source of truth for all model references
  - Eliminates 8+ hardcoded model arrays throughout codebase
  - Dynamic initialization using `Object.fromEntries()`

- **gemini-3-pro-preview Support** ⚠️:
  - Added to type system as optional model
  - Included in `ALL_MODELS` but not in default fallback
  - Model metadata includes warning badge

### Changed

#### 🚀 Default Model Update

**Updated default fallback chain** to prioritize models with free quota and higher performance:

1. **`gemini-3-flash-preview`** (Primary - Free quota available)
2. **`gemini-2.5-flash`** (Secondary - Stable, High performance)
3. **`gemini-2.5-flash-lite`** (Tertiary - Lightweight fallback)

#### 🔄 SDK Migration: @google/generative-ai → @google/genai

**Major internal SDK upgrade** with improved performance and architecture.

- **New SDK**: Migrated from `@google/generative-ai` v0.21.0 to `@google/genai` v1.33.0
- **Client Caching**: Implemented per-API-key client caching for improved performance
  - ~5-10ms performance improvement per request (cached clients)
  - Minimal memory overhead (~1KB for typical 2-5 key configurations)
  - Maintains full compatibility with multi-key rotation
- **New Public Method**: Added `clearCache()` to GeminiClient for manual cache invalidation

**Architecture Improvements**:
- Centralized API calls through `ai.models.*` namespace (cleaner, more maintainable)
- Simplified response structure (removed nested wrappers)
- Property-based text access instead of method calls

**Internal Changes** (No impact on public API):
- Updated response handling: `response.text()` → `response.text`
- Updated config parameter: `generationConfig` → `config`
- Updated streaming: Direct async iteration (no `.stream` property)
- All 172 tests passing with 97.59% coverage on GeminiClient

#### 🔧 Internal Refactoring

**Eliminated hardcoded model references** for easier maintenance:

- **FallbackClient.ts**:
  - Dynamic `modelUsage` initialization using `ALL_MODELS`
  - Replaced hardcoded array in `getFallbackStats()` with `ALL_MODELS`
  - Reduces maintenance burden from 30+ minutes to <5 minutes per model update

- **rate-limit-tracker.ts**:
  - Dynamic `defaultLimits` generation from `ALL_MODELS`
  - Updated `getModelsNearLimit()` to use `ALL_MODELS`
  - Updated `getStatistics()` to use `ALL_MODELS`
  - Automatic rate limit initialization for new models

- **health-monitor.ts**:
  - Updated `getAllHealth()` to use `ALL_MODELS`
  - Updated `initializeModels()` to use `ALL_MODELS`
  - Automatic health tracking for new models

### Infrastructure

#### 🧪 Integration Test Improvements

**Enhanced E2E testing reliability**:
- **Dynamic Package Detection**: Updated `run-all-tests.sh` to auto-detect the packed tarball version, removing the need for manual script updates when versions change.
- **Rate Limit Mitigation**: Implemented inter-test delays (2s) in CommonJS, ESM, and TypeScript test suites to prevent `429 Too Many Requests` errors during full execution.

### Performance

- **Request Latency**: 5-10ms improvement on cached client reuse
- **Throughput**: Better performance in high-volume scenarios (1000+ requests)
- **Memory**: Negligible overhead (<1KB for typical usage)
- **Maintenance Time Reduction**: Model updates now take <5 minutes (was 30+ minutes)
- **Type Safety**: Maintained strict TypeScript union types
- **Runtime Performance**: No performance impact (constants resolved at compile time)

### Testing

- **All 172 tests passing** (100% success rate)
- **GeminiClient coverage**: 97.59% statements
- **Updated test fixtures** for 3 models (was 2):
  - `tests/unit/fallback.test.ts` - Updated model expectations
  - `tests/unit/health-monitor.test.ts` - Updated model count assertions
- **Coverage maintained**: >90% for core library code
- **Zero TypeScript errors**
- **Zero linting errors**
- Updated test mocks to reflect new SDK structure

### Breaking Changes

**None** - This is a fully backward-compatible update:
- ✅ Public API unchanged (all methods, parameters, return types identical)
- ✅ Existing code continues to work without modifications
- ✅ New `ALL_MODELS` export is purely additive
- ✅ gemini-3-pro-preview is optional (not in default fallback)
- ✅ Type definitions unchanged

### Migration Notes

**For Users**: No action required - this is an internal dependency upgrade.

**For Contributors**: If developing or testing locally:
```bash
# Remove old node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify everything works
npm test
npm run build
```

### Technical Details

**SDK API Changes**:
| Aspect | Old SDK | New SDK |
|--------|---------|---------|
| Package | `@google/generative-ai` | `@google/genai` |
| Import | `GoogleGenerativeAI` | `GoogleGenAI` |
| Initialization | `new GoogleGenerativeAI(apiKey)` | `new GoogleGenAI({apiKey})` |
| API Calls | `model.generateContent()` | `ai.models.generateContent()` |
| Response | `response.text()` (method) | `response.text` (property) |
| Streaming | `result.stream` (nested) | Direct async iteration |

**Caching Strategy**:
- Clients cached per API key using `Map<string, GoogleGenAI>`
- Cache persists across requests for the same key
- `clearCache()` method available for manual invalidation
- Automatic garbage collection when keys are no longer used

## [0.3.1] - 2025-12-07

### Added

#### 🌟 GitHub Projects Showcase

- **Automated project discovery**: GitHub Actions workflow to find projects using gemback
- **Projects showcase section**: New "Projects Using Gem Back" section in README
- **Weekly updates**: Automated weekly updates (Monday 00:00 UTC) to showcase top 5 projects by stars
- **Manual trigger**: Support for manual showcase updates via GitHub Actions

#### 🛠️ Developer Tools

- `scripts/update-showcase.ts`: Main script for finding and updating project showcase
- `scripts/github-api.ts`: GitHub API client with rate limiting and retry logic
- `scripts/project-finder.ts`: Project search, validation, and ranking
- `scripts/readme-updater.ts`: Safe README manipulation with marker-based updates
- `scripts/types.ts`: TypeScript interfaces for showcase system
- `.github/workflows/update-projects-showcase.yml`: GitHub Actions automation

#### 📦 New Dependencies

- `@octokit/rest`: Official GitHub API client (devDependency)
- `tsx`: TypeScript execution for scripts (devDependency)

### Changed

#### 🚀 Default Model Update
- **Updated default fallback models**:
  - Primary: `gemini-2.5-flash`
  - Fallback: `gemini-2.5-flash-lite`
- **Removed deprecated models**:
  - `gemini-2.0-flash`
  - `gemini-2.0-flash-lite`
  - Removed from default fallback chain to align with new free tier quota

### Documentation

- Added "Projects Using Gem Back" showcase section to README
- New npm script: `npm run update-showcase`

## [0.3.0] - 2025-11-30

### Added

#### 🎨 Multimodal Support (Images, Video, Audio)
- **New `generateContent()` method**: Flexible API for multimodal inputs
  - Support for text, images, video, and audio
  - Can mix multiple content types in a single request
  - Multi-turn conversations with images

- **New `generateContentStream()` method**: Streaming support for multimodal content
  - Real-time streaming responses for image analysis
  - All the same features as `generateContent()` but with streaming

- **New Type Definitions**:
  - `Part`: Union type for content parts (text, inlineData, fileData)
  - `InlineData`: Base64-encoded inline data with mimeType
  - `FileData`: Google Cloud Storage file references
  - `Content`: Message content with role and parts array
  - `GenerateContentRequest`: Full request configuration for multimodal inputs

- **Image Input Formats**:
  - **Inline data**: Base64-encoded images (`inlineData`)
  - **File references**: Google Cloud Storage URIs (`fileData`)
  - Supported formats: JPEG, PNG, WebP, HEIC, HEIF

- **Examples**:
  - Added comprehensive `examples/multimodal.ts` with 6 usage scenarios:
    - Single image analysis
    - Multiple image comparison
    - Conversation with images
    - Streaming with images
    - Google Cloud Storage file references
    - Helper function for image to base64 conversion

### Enhanced

- **GeminiClient**:
  - Added `generateContent()` method for multimodal requests
  - Added `generateContentStream()` method for streaming multimodal requests
  - Both methods support all existing options (temperature, maxTokens, etc.)

- **GemBack (FallbackClient)**:
  - Added `generateContent()` method with full fallback support
  - Added `generateContentStream()` method with streaming fallback support
  - Multimodal requests benefit from all existing features:
    - Automatic model fallback
    - Retry logic
    - Rate limit tracking
    - Health monitoring
    - Multi-key rotation

- **Type Exports**:
  - Exported new types: `Part`, `Content`, `InlineData`, `FileData`, `GenerateContentRequest`
  - Full TypeScript support with type inference

### Testing

- **Added 10 new unit tests for multimodal functionality**:
  - Single image generation
  - Multiple images generation
  - File data (Google Cloud Storage) support
  - Generation options with multimodal content
  - Multi-turn conversation with images
  - Streaming with images
  - Streaming options with multimodal content
- **Total tests increased from 172 to 182**
- All 182 tests passing

### Documentation

- Added comprehensive multimodal examples in `examples/multimodal.ts`
- Code examples for:
  - Basic image analysis
  - Multiple image comparison
  - Conversational image understanding
  - Streaming responses
  - Cloud storage integration

### Migration Guide

New multimodal API usage:

```typescript
import { GemBack } from 'gemback';
import * as fs from 'fs';

const client = new GemBack({ apiKey: 'your-api-key' });

// Single image analysis
const imageData = fs.readFileSync('image.jpg').toString('base64');
const response = await client.generateContent({
  contents: [
    {
      role: 'user',
      parts: [
        { text: 'What is in this image?' },
        { inlineData: { mimeType: 'image/jpeg', data: imageData } }
      ]
    }
  ]
});

console.log(response.text);
```

### Breaking Changes

- None - v0.3.0 is fully backward compatible with v0.2.x
- Existing `generate()` and `generateStream()` methods remain unchanged

## [0.2.1] - 2025-11-24

### Changed

#### 🔄 Naming Consistency Improvements
- **Renamed main client class**: `GeminiBackClient` → `GemBack`
  - Improves consistency with library name `gemback`
  - More concise and intuitive class name
  - Updated in all source files, examples, and tests

- **Renamed options interface**: `GeminiBackClientOptions` → `GemBackOptions`
  - Better alignment with the new class name
  - Reduced verbosity in type annotations
  - Added deprecated type alias for backward compatibility:
    ```typescript
    export type GeminiBackClientOptions = GemBackOptions;
    ```

### Documentation

- Updated all documentation files:
  - README.md (English)
  - README.ko.md (Korean)
  - All example files (7 files)
  - Test files
  - Integration test files

### Migration Guide

Users should update their imports:

```typescript
// Before (v0.2.0)
import { GeminiBackClient, GeminiBackClientOptions } from 'gemback';
const options: GeminiBackClientOptions = { apiKey: '...' };
const client = new GeminiBackClient(options);

// After (v0.2.1)
import { GemBack, GemBackOptions } from 'gemback';
const options: GemBackOptions = { apiKey: '...' };
const client = new GemBack(options);
```

**Note**: The old names are still available as deprecated aliases for backward compatibility.

### Breaking Changes

- **Class name change**: Code directly referencing `GeminiBackClient` will need to be updated
- **Type name change**: Code using `GeminiBackClientOptions` type should be updated
- Deprecated aliases are provided for both to ease migration

## [0.2.0] - 2025-11-23

### Added

#### 🔐 Multi API Key Support and Rotation
- **Multiple API key management**: Support for using multiple API keys to bypass RPM limits
- **Rotation strategies**:
  - `round-robin`: Sequentially rotate through keys
  - `least-used`: Prioritize the least-used key
- **Per-key statistics**: Track usage, success/failure counts, and success rates for each key
- `ApiKeyRotator` class for intelligent key management
- 15 new tests for multi-key functionality

#### 📊 Monitoring & Tracking System
- **Rate Limit Tracker** (`RateLimitTracker`):
  - Real-time RPM (Requests Per Minute) tracking per model
  - Sliding window analysis (1-minute and 5-minute windows)
  - Predictive warnings:
    - 80% threshold: "Near limit" warning
    - 90% threshold: "Will exceed soon" warning
  - Recommended wait time calculation
  - Customizable rate limits per model
  - 21 comprehensive unit tests

- **Health Monitor** (`HealthMonitor`):
  - Model health status classification:
    - `healthy`: ≥95% success rate, <3s response time
    - `degraded`: 80-95% success rate, 3-5s response time
    - `unhealthy`: <80% success rate or >5s response time
  - Performance metrics:
    - Average response time
    - Percentile metrics (p50, p95, p99)
    - Success rate and availability tracking
    - Consecutive failure detection
  - 29 comprehensive unit tests

- **FallbackClient Integration**:
  - `enableMonitoring` option for opt-in monitoring
  - Automatic tracking for both `generate()` and `generateStream()`
  - Extended `getFallbackStats()` with monitoring data:
    - Rate limit status for all models
    - Health status for all models
    - Summary statistics across all models
  - 15 integration tests for monitoring features

### Enhanced

- **Configuration Options**:
  - Added `apiKeys` option for multi-key mode (alternative to `apiKey`)
  - Added `apiKeyRotationStrategy` option ('round-robin' | 'least-used')
  - Added `enableMonitoring` option to activate monitoring features
  - Added `enableRateLimitPrediction` option for rate limit warnings

- **Statistics**:
  - Extended `FallbackStats` with optional `apiKeyStats` array
  - Extended `FallbackStats` with optional `monitoring` object containing:
    - Rate limit status per model
    - Health metrics per model
    - Overall summary statistics

### Documentation

- Updated README.md with:
  - Multi-key rotation usage examples
  - Comprehensive monitoring feature documentation
  - Updated API reference with new options
  - Phase 2 completion status
- Added `examples/multi-key-example.ts` with 8 usage examples
- Added `examples/monitoring-example.ts` with 5 monitoring examples
- Updated PLAN.md with Phase 2 completion and Phase 3 roadmap

### Testing

- **Total tests increased from 100 to 165 (65% increase)**:
  - 21 unit tests for RateLimitTracker
  - 29 unit tests for HealthMonitor
  - 15 unit tests for ApiKeyRotator
  - 11 integration tests for multi-key functionality
  - 15 integration tests for monitoring features
- All 165 tests passing

### Performance

- Monitoring system uses efficient sliding windows for minimal overhead
- Optional monitoring features have zero impact when disabled
- Multi-key rotation optimizes RPM limit usage across keys

### Breaking Changes

- None - v0.2.0 is fully backward compatible with v0.1.0

## [0.1.0] - 2025-11-22

### Added

- Initial release of Gem Back (Gemini API Fallback Library)
- Support for 4 Gemini models with intelligent fallback:
  - `gemini-2.5-flash` (latest, highest performance)
  - `gemini-2.5-flash-lite` (lightweight version)
  - `gemini-2.0-flash` (stable version)
  - `gemini-2.0-flash-lite` (lightweight stable version)
- `GemBack` class for automatic model fallback
- `GeminiClient` class for direct model access
- Automatic retry logic with exponential backoff
- Smart error detection and handling:
  - Immediate fallback on 429 rate limit errors
  - Immediate failure on authentication errors (401/403)
  - Retry with backoff for transient errors (5xx, timeout)
- Streaming response support with `generateStream()`
- Chat conversation support with `chat()`
- Comprehensive statistics tracking:
  - Total requests
  - Success rate
  - Model usage breakdown
  - Failure count
- Configurable logging with 5 levels (debug, info, warn, error, silent)
- Full TypeScript support with complete type definitions
- Dual module support (CommonJS + ESM)
- Comprehensive test suite with 66 tests

### Features

- **Zero-config setup**: Works out of the box with sensible defaults
- **Customizable fallback order**: Specify your preferred model order
- **Retry configuration**: Adjust max retries, delays, and timeout
- **Statistics**: Track model usage and success rates
- **Debug mode**: Enable detailed logging for troubleshooting

### Documentation

- Comprehensive README with usage examples
- 5 example files covering common use cases
- API documentation with TypeDoc
- Contribution guidelines
- MIT License

[Unreleased]: https://github.com/Laeyoung/gem-back/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/Laeyoung/gem-back/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Laeyoung/gem-back/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Laeyoung/gem-back/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Laeyoung/gem-back/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/Laeyoung/gem-back/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Laeyoung/gem-back/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/Laeyoung/gem-back/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Laeyoung/gem-back/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Laeyoung/gem-back/releases/tag/v0.1.0
