# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Laeyoung/gem-back/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Laeyoung/gem-back/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Laeyoung/gem-back/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Laeyoung/gem-back/releases/tag/v0.1.0
