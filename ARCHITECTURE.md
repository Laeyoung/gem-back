# Gem Back Architecture & Cross-Platform Design

## Overview
Gem Back is a multi-language library providing intelligent fallback, retry, multi-key rotation, and monitoring for the Google Gemini API.
Currently supported in **Node.js** (Reference Implementation).
Target languages: **Python**, **Kotlin**, **Go**.

## Core Concepts & Terminology

| Concept | Description |
| :--- | :--- |
| **GemBack Client** | Main entry point. Handles configuration and orchestration. |
| **Fallback Loop** | Iterates through models in `fallbackOrder`. |
| **Retry Strategy** | Exponential backoff for transient errors (5xx, Timeout). |
| **Key Rotation** | `ApiKeyRotator`. Rotates keys (Round-Robin / Least-Used) to bypass RPM limits. |
| **Monitoring** | `RateLimitTracker` (RPM tracking/prediction) & `HealthMonitor` (Success rate, Latency). |
| **Adapter/Wrapper** | Wraps official Google Gen AI SDKs to normalize behavior. |

## Language-Specific Implementation Plan

### 1. Node.js (Existing)
- **Path**: Root (`./`) (Historical reasons)
- **Async Model**: `Promise` / `async/await`
- **Streaming**: `AsyncGenerator`
- **SDK**: `@google/genai`

### 2. Python (Priority 1)
- **Path**: `python/`
- **Async Model**: `asyncio` (coroutines)
- **Streaming**: `AsyncIterator` (`async for`)
- **SDK**: `google-genai` (Official)
- **Package Manager**: `poetry` or `pip` (standard `pyproject.toml`)
- **Structure**:
  ```
  python/
  ├── gemback/
  │   ├── __init__.py
  │   ├── client.py        # GemBack class
  │   ├── models.py        # Data classes
  │   ├── rotators.py      # ApiKeyRotator
  │   └── monitoring/
  │       ├── health.py
  │       └── rate_limit.py
  ├── tests/
  └── pyproject.toml
  ```

### 3. Go
- **Path**: `go/`
- **Async Model**: Goroutines & Channels
- **Streaming**: Channel-based or `iter` (Go 1.23+)
- **SDK**: `google.golang.org/genai` (Official)
- **Structure**:
  ```
  go/
  ├── gemback/
  │   ├── client.go
  │   ├── rotator.go
  │   └── monitor.go
  └── go.mod
  ```

### 4. Kotlin
- **Path**: `kotlin/`
- **Async Model**: Kotlin Coroutines (`suspend` functions)
- **Streaming**: `Flow<T>`
- **SDK**: `google-cloud-vertexai` (Java/Kotlin) or `google-ai-client`
- **Structure**:
  ```
  kotlin/
  ├── src/main/kotlin/com/gemback/
  │   ├── GemBack.kt
  │   └── ...
  └── build.gradle.kts
  ```

## Feature Parity Checklist

All implementations must support:
1.  **Config**: `apiKey` (single) or `apiKeys` (list), `fallbackOrder` (list of models).
2.  **Fallback**: Try Model A -> Fail -> Try Model B.
3.  **Retry**: Max retries with exponential backoff for 5xx/Timeout.
4.  **Exceptions**: Stop on Auth errors (401/403).
5.  **Rotation**: Support `round-robin` and `least-used` strategies for keys.
6.  **Monitoring**:
    -   Track RPM per model.
    -   Predict rate limits (warn if close).
    -   Track health (success rate, latency).

## Shared Configuration
-   **Model Names**: Keep consistent strings (e.g., `"gemini-2.5-flash"`).
-   **Defaults**:
    -   `timeout`: 30s
    -   `maxRetries`: 2
