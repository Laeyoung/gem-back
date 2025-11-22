# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-11-22

### Added

- Initial release of Gem Back (Gemini API Fallback Library)
- Support for 4 Gemini models with intelligent fallback:
  - `gemini-2.5-flash` (latest, highest performance)
  - `gemini-2.5-flash-lite` (lightweight version)
  - `gemini-2.0-flash` (stable version)
  - `gemini-2.0-flash-lite` (lightweight stable version)
- `GeminiBackClient` class for automatic model fallback
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

[Unreleased]: https://github.com/Laeyoung/gem-back/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Laeyoung/gem-back/releases/tag/v0.1.0
