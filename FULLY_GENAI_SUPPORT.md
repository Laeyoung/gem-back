# GemBack Feature Expansion Plan: Full @google/genai SDK Support

## Overview

**Goal**: Expand GemBack to support 100% of the `@google/genai` SDK features while maintaining the library's core value proposition (intelligent fallback + rate limit monitoring).

**Current Coverage**: ~40% of SDK features (basic text generation, streaming, chat, multimodal)
**Gap**: 17 major SDK features not yet implemented
**Strategy**: Phased rollout prioritized by user value and fallback benefit

---

## Priority Framework

Each feature scored on:
1. **Usage Frequency** (30%): How often users need this
2. **User Value** (30%): Impact on developer experience
3. **Fallback Benefit** (25%): How much GemBack's core features enhance this
4. **Implementation Complexity** (15%): Development effort

---

## Phase 1: P0 Features (Q1 2025) - v0.5.0 & v0.6.0

**Target**: Essential production-grade capabilities
**Effort**: 6-8 weeks
**Release Strategy**: Two releases (v0.5.0 + v0.6.0)

### 1. Function Calling / Tool Use ⭐ Score: 9.2

**Why P0**: Most requested AI feature. Enables agents, workflows, structured interactions.

**Implementation**:
- Add `FunctionDeclaration`, `ToolConfig`, `FunctionCall` types
- Extend `GenerateOptions` with `tools` and `toolConfig`
- Enhance `GeminiResponse` with `functionCalls?: FunctionCall[]`
- Implement fallback on tool call failures
- Track tool call success rates per model

**Files to Modify**:
```
src/types/config.ts          - Add tool/function types
src/types/response.ts        - Add functionCalls field
src/client/GeminiClient.ts   - Pass tools to SDK
src/client/FallbackClient.ts - Fallback logic for tool failures
src/monitoring/health-monitor.ts - Track tool call metrics
tests/unit/function-calling.test.ts - NEW
```

**Effort**: Large (3 weeks)

---

### 2. System Instructions ⭐ Score: 8.9

**Why P0**: Fundamental for behavior control. Zero-shot prompting requires consistent context.

**Implementation**:
- Add `systemInstruction?: string | Content` to `GenerateOptions`
- Pass through to SDK in all generation methods
- Test system instruction support per model
- Log warnings for weak adherence

**Files to Modify**:
```
src/types/config.ts          - Add systemInstruction
src/client/GeminiClient.ts   - Pass to SDK
src/client/FallbackClient.ts - Include in all generation calls
tests/unit/system-instructions.test.ts - NEW
```

**Effort**: Small (3 days)

---

### 3. Safety Settings ⭐ Score: 8.7

**Why P0**: Production compliance requirement. Different models have different safety thresholds.

**Implementation**:
- Add `HarmCategory`, `HarmBlockThreshold`, `SafetySetting` enums/interfaces
- Add `safetySettings?: SafetySetting[]` to `GenerateOptions`
- Classify safety blocks as special error type
- Automatic fallback on safety blocks
- Track safety block rates per model

**Files to Modify**:
```
src/types/config.ts          - Add safety enums and interfaces
src/types/errors.ts          - Add SafetyBlockError
src/utils/error-handler.ts   - Detect safety blocks
src/client/FallbackClient.ts - Fallback on safety blocks
src/monitoring/health-monitor.ts - Track safety metrics
tests/unit/safety-settings.test.ts - NEW
```

**Effort**: Small (4 days)

---

### 4. JSON Mode (Structured Outputs) ⭐ Score: 8.5

**Why P0**: Critical for reliable API integration. Eliminates parsing errors.

**Implementation**:
- Add `ResponseSchema` interface (type, properties, required)
- Add `responseMimeType?: 'application/json'` to `GenerateOptions`
- Add `responseSchema?: ResponseSchema` for schema enforcement
- Add `json?: any` to `GeminiResponse` (parsed JSON)
- Validate JSON before returning
- Auto-retry with clarification if invalid
- Track JSON compliance rate per model

**Files to Modify**:
```
src/types/config.ts          - Add schema types
src/types/response.ts        - Add json field
src/client/GeminiClient.ts   - Parse JSON responses
src/client/FallbackClient.ts - Validate and retry logic
src/monitoring/health-monitor.ts - Track JSON compliance
tests/unit/json-mode.test.ts - NEW
```

**Effort**: Medium (1.5 weeks)

---

## Phase 2: P1 Features (Q2 2025) - v0.7.0 & v0.8.0

**Target**: Advanced reliability and performance
**Effort**: 8-10 weeks

### 5. Semantic Caching (Context Caching) ⭐ Score: 8.3

**Why P1**: Massive cost savings (80%+) and performance boost for repeated prompts.

**Implementation**:
- Create `CacheManager` class with CRUD operations
- Add `CachedContent` interface (name, model, contents, TTL)
- Cache per model (fallback gets own cache)
- Multi-key cache coordination
- Track cache hit rates in monitoring

**Files to Modify**:
```
src/caching/cache-manager.ts - NEW (core caching logic)
src/types/config.ts          - Add caching options
src/client/FallbackClient.ts - Integrate caching
src/monitoring/rate-limit-tracker.ts - Cache-aware tracking
tests/unit/caching.test.ts   - NEW
```

**Effort**: Large (2.5 weeks)

---

### 6. Native Chat Sessions ⭐ Score: 7.9

**Why P1**: Current `chat()` is basic. Native sessions provide proper turn management and token efficiency.

**Implementation**:
- Create `ChatSession` class with state management
- Methods: `sendMessage()`, `sendMessageStream()`, `getHistory()`, `clearHistory()`
- Preserve history on model fallback
- Auto-migrate session to fallback model
- Track session success rates

**Files to Modify**:
```
src/client/ChatSession.ts    - NEW (session class)
src/client/FallbackClient.ts - Add startChat() method
src/types/config.ts          - Add chat session options
tests/unit/chat-session.test.ts - NEW
```

**Effort**: Medium (2 weeks)
**Dependencies**: System Instructions (P0)

---

### 7. File Uploads (ai.files) ⭐ Score: 7.6

**Why P1**: Large document processing (PDFs, videos). Bandwidth reduction for repeated use.

**Implementation**:
- Create `FileManager` class with upload/get/list/delete
- Add `UploadedFile` interface (name, state, URI, metadata)
- Retry uploads on transient failures
- Track upload success rates
- Automatic cleanup of expired files

**Files to Modify**:
```
src/files/file-manager.ts    - NEW (file operations)
src/types/config.ts          - File-related types
src/client/FallbackClient.ts - Integrate FileManager
tests/unit/file-uploads.test.ts - NEW
```

**Effort**: Medium (1.5 weeks)

---

### 8. Embeddings API ⭐ Score: 7.4

**Why P1**: Essential for RAG, semantic search, vector databases.

**Implementation**:
- Add `embedContent(content, options)` method
- Support single string or array of strings
- Add `EmbeddingOptions` (model, taskType, title)
- Fallback to alternate embedding models
- Cache embeddings for repeated content

**Files to Modify**:
```
src/types/config.ts          - Add embedding types
src/types/response.ts        - Add EmbeddingResult
src/client/GeminiClient.ts   - Call SDK embedding API
src/client/FallbackClient.ts - Add embedContent method
tests/unit/embeddings.test.ts - NEW
```

**Effort**: Small (1 week)

---

## Phase 3: P2 Features (Q3-Q4 2025) - v0.9.0 & v1.0.0

**Target**: Advanced capabilities for power users
**Effort**: 10-12 weeks

### 9. Batch Processing ⭐ Score: 7.2
- Async job management with 50% cost discount
- **Effort**: X-Large (3 weeks)

### 10. Search Grounding ⭐ Score: 6.8
- Google Search integration for real-time info
- **Effort**: Medium (1.5 weeks)

### 11. Code Execution ⭐ Score: 6.5
- Enable computational tasks and data analysis
- **Effort**: Large (2 weeks)

### 12. Extended Thinking ⭐ Score: 6.2
- Deep reasoning mode for complex tasks
- **Effort**: Small (3 days)

---

## Phase 4: P3 Features (2026+) - Experimental

**Recommendation**: Wait for user demand validation

### 13. Live Sessions (ai.live) - Score: 5.8
### 14. Interactions API - Score: 5.5
### 15. Agents (Specialized Models) - Score: 5.2
### 16. Image Generation Output - Score: 4.8
### 17. MCP Integration - Score: 4.2

---

## Release Timeline

### v0.5.0 (Feb 2025) - "Foundation"
- ✅ Function Calling (L)
- ✅ System Instructions (S)
- **4-5 weeks**

### v0.6.0 (Mar 2025) - "Safety & Structure"
- ✅ Safety Settings (S)
- ✅ JSON Mode (M)
- **3-4 weeks**

### v0.7.0 (May 2025) - "Performance"
- ✅ Semantic Caching (L)
- ✅ Embeddings API (S)
- **4-5 weeks**

### v0.8.0 (Jun 2025) - "Conversations"
- ✅ Native Chat Sessions (M)
- ✅ File Uploads (M)
- **4-5 weeks**

### v0.9.0 (Sep 2025) - "Advanced"
- ✅ Batch Processing (XL)
- ✅ Search Grounding (M)
- **6-7 weeks**

### v1.0.0 (Dec 2025) - "Production Complete"
- ✅ Code Execution (L)
- ✅ Extended Thinking (S)
- ✅ Documentation & hardening
- **4-5 weeks**

---

## Critical Files Overview

### Core Types
- **src/types/config.ts** - Add new options for each feature
- **src/types/response.ts** - Enhanced response types
- **src/types/errors.ts** - New error classifications

### Client Layer
- **src/client/FallbackClient.ts** - Main integration point for all features
- **src/client/GeminiClient.ts** - SDK wrapper with new methods

### Monitoring
- **src/monitoring/health-monitor.ts** - Track per-feature success rates
- **src/monitoring/rate-limit-tracker.ts** - Feature-aware rate limiting

### New Modules (Create as needed)
- **src/caching/** - Semantic caching
- **src/files/** - File upload management
- **src/client/ChatSession.ts** - Native chat sessions

---

## Implementation Principles

### Backward Compatibility
- **No breaking changes** until v1.0.0
- All features are **additive** (extend existing interfaces)
- Deprecation warnings for replaced APIs
- Migration guides for major versions

### Testing Requirements
- Maintain ≥85% test coverage
- 15-20 new tests per feature
- Mock SDK responses for unit tests
- Integration tests with real API (opt-in)

### Monitoring Integration
- Each feature tracked in `FallbackStats`
- Per-feature success rates and latency
- Model capability matrix (which models support which features)
- Cost tracking for batch/cache features

### Documentation
- API reference for each feature
- Code examples and best practices
- Performance benchmarks
- Migration guides

---

## Fast Track Alternative

If resources are limited:

**v0.5.0 (8 weeks)**: Function Calling + System Instructions + Safety Settings + JSON Mode
**v0.6.0 (6 weeks)**: Semantic Caching + Native Chat
**v1.0.0 (4 weeks)**: Documentation + hardening

**Total**: 18 weeks to deliver 80% of user value

---

## Success Metrics

### Per Release
- Test coverage: ≥85%
- Zero regressions
- Documentation: 100% complete
- Community feedback: ≥4.5/5

### Overall (v1.0.0)
- SDK feature parity: ≥90%
- npm downloads: 100+/week
- GitHub stars: 500+
- Issue resolution: <7 days

---

## Next Steps

1. **Review this plan** - Confirm priorities and roadmap alignment
2. **Start v0.5.0** - Begin implementation with Function Calling + System Instructions
3. **Set up project board** - Track progress and milestones
4. **Community feedback** - Validate priorities with users

---

## Implementation Notes

**Version Control**: Each release will be tagged and documented in CHANGELOG.md following the existing project conventions.

**Testing Strategy**: Each feature will include comprehensive test coverage before merging, maintaining the current ≥85% threshold.

**Monitoring**: Track implementation progress and feature adoption through GitHub Issues and project boards.

---

## Key Insights

- **Fallback value varies**: P0 features benefit most from GemBack's fallback (function calling, safety settings) because they fail unpredictably
- **Implementation complexity**: P0 features are mostly additive (extend existing interfaces), minimizing risk
- **Phased approach**: Splitting into 6 releases allows for user feedback and course correction
- **Documentation-first**: Comprehensive documentation ensures smooth adoption and reduces support burden
