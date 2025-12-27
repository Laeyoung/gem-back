# 💎 Gem Back Context for Gemini

## Project Overview

**Gem Back** is a production-grade TypeScript library designed to provide intelligent fallback, multi-key rotation, and monitoring for the Google Gemini API. Its primary goal is to solve RPM (Requests Per Minute) rate limit issues inherent in the Gemini API free tier by automatically switching models or rotating API keys.

### Core Problems Solved
1.  **Rate Limit Handling**: Bypasses `429 Too Many Requests` errors using fallback models and key rotation.
2.  **Reliability**: Implements exponential backoff retries and graceful degradation.
3.  **Observability**: Provides real-time rate limit prediction and model health monitoring.

## Tech Stack

*   **Language**: TypeScript (ES2020 target, Strict mode)
*   **Runtime**: Node.js (>= 18.0.0)
*   **Bundler**: `tsup` (Builds to CJS and ESM)
*   **Testing**: `vitest` (Unit and Integration tests)
*   **Linting/Formatting**: `eslint`, `prettier`
*   **Dependencies**: `@google/genai` (Core SDK)

## Project Architecture

### Directory Structure

```
/
├── src/
│   ├── client/
│   │   ├── FallbackClient.ts    # MAIN ENTRY: Orchestrates fallback, retry, and monitoring
│   │   └── GeminiClient.ts      # WRAPPER: Direct wrapper around Google GenAI SDK
│   ├── monitoring/
│   │   ├── rate-limit-tracker.ts # RPM tracking and prediction logic
│   │   └── health-monitor.ts     # Model health status (success rate, latency)
│   ├── utils/
│   │   ├── api-key-rotator.ts    # Multi-key management (Round-robin/Least-used)
│   │   ├── retry.ts              # Exponential backoff logic
│   │   └── error-handler.ts      # Error classification (Retryable vs Fatal)
│   └── types/                    # TypeScript definitions
├── tests/
│   ├── unit/        # Component isolation tests
│   ├── integration/ # System interaction tests
│   └── mocks/       # Gemini API mocks
├── examples/        # Usage examples
└── dist/            # Compiled output (CJS/ESM)
```

### Key Architectural Patterns

1.  **Fallback Chain**:
    *   Requests attempt models in a defined `fallbackOrder`.
    *   **Default Order**: `gemini-3-flash-preview` -> `gemini-2.5-flash` -> `gemini-2.5-flash-lite`.
    *   **429 (Rate Limit)** -> Immediate fallback to next model.
    *   **5xx (Server Error)** -> Retry with backoff, then fallback.
    *   **401/403 (Auth)** -> Fatal error, stops chain.

2.  **Multi-Key Rotation**:
    *   Rotates through a pool of API keys to effectively increase RPM limits.
    *   Strategies: `round-robin` (default) or `least-used`.
    *   Note: Rate limits are enforced **per model**, not just per key.

3.  **Monitoring System**:
    *   **Predictive**: Tracks usage windows to predict 429s before they happen (80%/90% thresholds).
    *   **Health**: Classifies models as `healthy`, `degraded`, or `unhealthy` based on success rates and latency.

## Key Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Build** | `npm run build` | Compiles TS to `dist/` (CJS & ESM) using `tsup` |
| **Dev** | `npm run dev` | Build in watch mode |
| **Test** | `npm test` | Run all tests using `vitest` |
| **Test Watch** | `npm run test:watch` | Run tests in watch mode |
| **Lint** | `npm run lint` | Check code with ESLint |
| **Format** | `npm run format` | Format code with Prettier |
| **Typecheck** | `npm run typecheck` | Run TS compiler check without emitting files |
| **Pre-publish**| `npm run prepublishOnly`| Runs build and tests (CI pipeline) |

## Development Conventions

### Coding Style
*   **Strict Typing**: No `any` if possible. Use defined types in `src/types/`.
*   **Async/Await**: Prefer over `.then()`.
*   **Error Handling**: Use `GeminiBackError` for library-specific errors. Catch errors at the top level of the public API methods.

### Testing Guidelines
*   **Coverage**: Maintain >85% test coverage.
*   **Mocking**: **NEVER** make real API calls in tests. Use `tests/mocks/gemini-api-mock.ts`.
*   **Scenarios**: Test the "happy path", but prioritize edge cases:
    *   All models failing.
    *   Network timeouts.
    *   Rate limit triggers (ensure fallback happens).
    *   Key rotation sequence.

### Commits
*   Follow **Conventional Commits**: `type(scope): message`
    *   `feat`: New features
    *   `fix`: Bug fixes
    *   `refactor`: Code restructuring
    *   `docs`: Documentation updates
    *   `test`: Test additions/updates

## Common Tasks

### Adding a New Model
1.  Update `GeminiModel` type in `src/types/models.ts` (or use `npm run update-models`).
2.  Add to `SUPPORTED_MODELS` list.
3.  `DEFAULT_FALLBACK_ORDER` in `src/types/models.ts` is auto-generated.
4.  Add unit tests ensuring the new model is attempted in the chain.

### Modifying Fallback Logic
*   Edit `src/client/FallbackClient.ts`.
*   Ensure changes are reflected across `generate`, `generateStream`, and `chat`.
*   Verify `error-handler.ts` correctly classifies any new error types.
