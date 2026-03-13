# Gemini 모델 업데이트 계획서

> 작성일: 2026-03-13 (8차 리뷰 반영: 2026-03-13)
> 브랜치: `feat/support-and-deprecated-gemini-model`
> 현재 버전: v0.5.0

---

## 1. 배경

2026년 3월 기준 Gemini API의 모델 라인업이 크게 변경되었습니다:
- **Gemini 3.1 시리즈** 출시 (`gemini-3.1-pro-preview`, `gemini-3.1-flash-lite-preview`)
- **Gemini 3 Pro Preview** 종료 (2026-03-09)
- **Gemini 2.0 시리즈** 6월 종료 예정
- **Gemini 2.5 시리즈** 6~10월 순차 종료 예정

## 2. 현재 상태 vs 목표 상태

### 현재 `GeminiModel` 타입 (models.ts)
```
gemini-2.5-flash, gemini-2.5-pro, gemini-2.5-flash-lite,
gemini-2.0-flash, gemini-2.0-flash-lite,
gemini-3-flash-preview, gemini-3-pro-preview
```

### 현재 `DEFAULT_FALLBACK_ORDER`
```
gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-flash-lite
```

### 목표 `GeminiModel` 타입
```
# 새로 추가
gemini-3.1-pro-preview       (신규 - Gemini 3 Pro Preview 대체)
gemini-3.1-flash-lite-preview (신규 - 최저가 경량 모델)

# 유지 (종료 예정이지만 아직 활성)
gemini-3-flash-preview        (유지 - 활성)
gemini-2.5-flash              (유지 - 2026-06-17 종료 예정)
gemini-2.5-pro                (유지 - 2026-06-17 종료 예정)
gemini-2.5-flash-lite         (유지 - 2026-07-22 종료 예정)
gemini-2.0-flash              (유지 - 2026-06-01 종료 예정)
gemini-2.0-flash-lite         (유지 - 2026-06-01 종료 예정)

# 제거
gemini-3-pro-preview          (삭제 - 2026-03-09 종료됨)
```

### 목표 `DEFAULT_FALLBACK_ORDER`
```
gemini-3-flash-preview → gemini-2.5-flash → gemini-3.1-flash-lite-preview
```
> 변경 이유: `gemini-3.1-flash-lite-preview`가 `gemini-2.5-flash-lite`보다 최신이고,
> `gemini-2.5-flash-lite`는 7월 종료 예정이므로 미리 전환.
> `gemini-3-flash-preview`는 아직 stable이 아니지만 성능이 가장 좋아 1순위 유지.
>
> **주의**: preview 모델 2개가 기본 fallback에 포함됨. stable 모델들이 모두 종료 예정이라
> 현실적으로 불가피하지만, 프로덕션에서는 `fallbackOrder`를 명시적으로 지정하도록 권고.

---

## 3. 변경 대상 파일 (전체)

### Step 1: `src/types/models.ts` 수정

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/models.ts` | `GeminiModel` 타입에 신규 모델 추가, `gemini-3-pro-preview` 제거, `DEFAULT_FALLBACK_ORDER` 업데이트, `ALL_MODELS` 업데이트, JSDoc 주석 수정 |

### Step 2: `src/config/deprecated.ts` 신규 생성

| 파일 | 변경 내용 |
|------|-----------|
| `src/config/deprecated.ts` | **(신규 파일)** `DEPRECATED_MODELS` 상수 + `DeprecatedModelInfo` 인터페이스 (auto-generated 파일과의 충돌 방지) |

### Step 3: `src/config/models.ts` 수정

| 파일 | 변경 내용 |
|------|-----------|
| `src/config/models.ts` | `MODEL_PRIORITY`에 신규 모델 추가, `gemini-3-pro-preview` 제거, `MODEL_INFO`에 신규 모델 메타데이터 추가 |

### Step 4: `src/index.ts` export 추가

| 파일 | 변경 내용 |
|------|-----------|
| `src/index.ts` | `DEPRECATED_MODELS`, `DeprecatedModelInfo` export 추가 |

### Step 5: 모델 생성 스크립트 업데이트

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/generate-models.ts` | `targetFallbackOrder` 배열 업데이트, `extractVersion()` 정규식 버그 수정 |
| `scripts/fetch-models.ts` | 필터링 로직 버그 수정 (220행): `gemini-3.1-*`이 최신이 되면 `gemini-3-flash-preview`가 제외되는 문제 |

### Step 6: Deprecation 경고 기능

| 파일 | 변경 내용 |
|------|-----------|
| `src/client/FallbackClient.ts` | `warnedDeprecatedModels` Set 프로퍼티 추가 (36행 이후), 생성자에서 fallbackOrder 내 deprecated 모델 경고, `checkDeprecatedModel()` private 메서드 추가, `generate()`, `generateStream()`, `generateContent()`, `generateContentStream()` 4개 메서드에서 호출 |

### Step 7: 테스트 업데이트

| 파일 | 변경 라인 | 변경 내용 |
|------|-----------|-----------|
| `tests/unit/models.test.ts` | 17행, 26~29행 | 모델 목록 검증 업데이트 (`gemini-3-pro-preview` → `gemini-3.1-pro-preview`), "should not include shutdown models"로 재설계, `DEPRECATED_MODELS` 테스트 추가 |
| `tests/unit/fallback.test.ts` | 31행, 102행(주석), 238~240행 | `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite-preview` |
| `tests/unit/health-monitor.test.ts` | 333행, 334행 | `toBeGreaterThanOrEqual(7)` → `(8)`, `gemini-3-pro-preview` → `gemini-3.1-pro-preview` |
| `tests/integration/fallback-flow.test.ts` | 25행, 43~47행, 49행, 257~258행, 276~282행 | `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite-preview` (fallback 3번째 모델 참조 전체) |
| **(신규)** `tests/unit/deprecated.test.ts` 또는 `fallback.test.ts`에 추가 | - | deprecation 경고 기능 테스트 (아래 상세 참조) |

> **영향 없는 테스트 파일** (변경 불필요):
> `client.test.ts`, `client-caching.test.ts`, `function-calling.test.ts`, `json-mode.test.ts`,
> `safety-settings.test.ts`, `system-instructions.test.ts`, `rate-limit-tracker.test.ts`,
> `api-key-rotator.test.ts`, `logger.test.ts`, `retry.test.ts`,
> `monitoring-integration.test.ts`, `multi-key-integration.test.ts`, `tests/mocks/`

### Step 8: 예제 업데이트

| 파일 | 변경 내용 |
|------|-----------|
| `examples/custom-fallback.ts` | 16행: `gemini-2.0-flash` → 최신 모델로 교체 |

> **변경 불필요한 파일** (유지 대상 모델만 참조):
> `test-integration/` 4개 파일, `test-integration/TEST_SCENARIOS.md`, `examples/README.md`
> `IMPROVEMENT_PLAN.md` (역사적 문서, 모델 목록 참조 없음)

### Step 9: 문서 및 버전 업데이트

| 파일 | 변경 라인 | 변경 내용 |
|------|-----------|-----------|
| `package.json` | 3행 | `"version": "0.5.0"` → `"version": "0.6.0"` |
| `README.md` | 43행, 46행, 91행 | 43: `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite-preview`, 46: `gemini-3-pro-preview` → `gemini-3.1-pro-preview` + `gemini-3.1-flash-lite-preview` 추가, 91: `gemini-3-pro-preview` → `gemini-3.1-pro-preview` |
| `README.ko.md` | 41행, 44행 | README.md 43행, 46행과 동일 패턴 (한국어 버전 라인 오프셋 -2) |
| `GEMINI.md` | 51행 | `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite-preview` |
| `CLAUDE.md` | 135행, 193행, 195행, 213행 | 135: 모델 목록 업데이트, 193: 모델 수 8개로 수정, 195/213: `src/config/defaults.ts` → `src/types/models.ts` (기존 경로 오류 수정) |
| `CHANGELOG.md` | 8행 이후, 631행 | v0.6.0 섹션 추가 (Added: deprecation 경고 기능, Changed: 모델 목록/fallback 변경, Breaking Changes: `gemini-3-pro-preview` 제거), 631행 링크: `[Unreleased]` → `v0.6.0...HEAD`, `[0.6.0]` 신규 추가, 기존 `[Unreleased]`의 `v0.4.0` → `v0.5.0` 오류도 함께 수정 |

> **참고**: `package-lock.json`은 `npm install` 실행 시 자동 갱신되므로 수동 수정 불필요.

> **자동 갱신 파일** (변경 불필요):
> `scripts/models-data.json`, `.models-cache.json` — `npm run fetch-models` 실행 시 자동 갱신됨

---

## 4. 상세 구현 계획

### Step 1: `src/types/models.ts` 수정

```typescript
// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: ...
// Source: Gemini API v1beta/models
// Generator: scripts/generate-models.ts

/**
 * Supported Gemini model identifiers
 */
export type GeminiModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  /** ⚠️ PREVIEW - Gemini 3 Flash Preview */
  | 'gemini-3-flash-preview'
  /** ⚠️ PREVIEW - Gemini 3.1 Pro Preview */
  | 'gemini-3.1-pro-preview'
  /** ⚠️ PREVIEW - Gemini 3.1 Flash-Lite Preview */
  | 'gemini-3.1-flash-lite-preview';

/**
 * Default fallback order
 * Note: Includes preview models because all stable models are scheduled for deprecation.
 * For production use, explicitly specify your own fallbackOrder.
 */
export const DEFAULT_FALLBACK_ORDER: GeminiModel[] = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview',
];

/**
 * All supported models (including preview and experimental)
 */
export const ALL_MODELS: GeminiModel[] = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview',
];
```

### Step 2: `src/config/deprecated.ts` (신규 파일)

> auto-generated 파일(`models.ts`)과의 충돌을 방지하기 위해 별도 파일로 분리.

```typescript
import type { GeminiModel } from '../types/models';

/**
 * Deprecated model information
 * Models that are scheduled for shutdown with replacement recommendations
 */
export interface DeprecatedModelInfo {
  model: GeminiModel;
  shutdownDate: string;       // ISO date string (YYYY-MM-DD)
  replacement: GeminiModel;
  reason: string;
}

export const DEPRECATED_MODELS: DeprecatedModelInfo[] = [
  {
    model: 'gemini-2.0-flash',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-2.5-flash',
    reason: 'Gemini 2.0 series end of life',
  },
  {
    model: 'gemini-2.0-flash-lite',
    shutdownDate: '2026-06-01',
    replacement: 'gemini-2.5-flash-lite',
    reason: 'Gemini 2.0 series end of life',
  },
  {
    model: 'gemini-2.5-flash',
    shutdownDate: '2026-06-17',
    replacement: 'gemini-3-flash-preview',
    reason: 'Gemini 2.5 Flash scheduled deprecation',
  },
  {
    model: 'gemini-2.5-pro',
    shutdownDate: '2026-06-17',
    replacement: 'gemini-3.1-pro-preview',
    reason: 'Gemini 2.5 Pro scheduled deprecation',
  },
  {
    model: 'gemini-2.5-flash-lite',
    shutdownDate: '2026-07-22',
    replacement: 'gemini-3.1-flash-lite-preview',
    reason: 'Gemini 2.5 Flash-Lite scheduled deprecation',
  },
];
```

### Step 3: `src/config/models.ts` 수정

> 이 파일은 auto-generated이지만, `npm run update-models` 전까지는 수동 편집 필요.
> 스크립트 수정(Step 5) 후 `npm run update-models` 실행 시 자동 반영됨.

- `gemini-3-pro-preview` 항목 제거: 19행 (`MODEL_PRIORITY`), 64~68행 (`MODEL_INFO`)
- 신규 모델 추가 (19행 직전, 68행 직전에 삽입):

```typescript
// MODEL_PRIORITY 추가
'gemini-3.1-pro-preview': 1005,      // preview + pro
'gemini-3.1-flash-lite-preview': 1010, // preview + lite

// MODEL_INFO 추가
'gemini-3.1-pro-preview': {
  name: 'Gemini 3.1 Pro Preview',
  description: 'Advanced intelligence, complex problem-solving with powerful agentic and coding capabilities',
  maxTokens: 65536,
},
'gemini-3.1-flash-lite-preview': {
  name: 'Gemini 3.1 Flash-Lite Preview',
  description: 'Most cost-efficient model, optimized for low latency high-volume use cases',
  maxTokens: 65536,
},
```

### Step 4: `src/index.ts` export 추가 (17행 `GeminiBackError` export 이후, 파일 끝에 삽입)

```typescript
export { DEPRECATED_MODELS } from './config/deprecated';
export type { DeprecatedModelInfo } from './config/deprecated';
```

### Step 5-1: `scripts/generate-models.ts` 수정

#### 5-1a. `targetFallbackOrder` 배열 업데이트 (108~112행)
```typescript
const targetFallbackOrder = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview'
];
```

#### 5-1b. `extractVersion()` 정규식 버그 수정 (35~41행)
현재 `/gemini-(\d+)\.(\d+)/`는 `gemini-3-flash-preview` (dot 없는 major-only)를 파싱하지 못함.

```typescript
// Before
function extractVersion(modelName: string): [number, number] {
  const match = modelName.match(/gemini-(\d+)\.(\d+)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2])];
  }
  return [0, 0];
}

// After
function extractVersion(modelName: string): [number, number] {
  const match = modelName.match(/gemini-(\d+)(?:\.(\d+))?/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2] ?? '0')];
  }
  return [0, 0];
}
```

이 수정으로:
- `gemini-3-flash-preview` → `[3, 0]` (기존: `[0, 0]`)
- `gemini-3.1-pro-preview` → `[3, 1]` (기존과 동일)
- `gemini-2.5-flash` → `[2, 5]` (기존과 동일)
- `gemini-2.0-flash-lite` → `[2, 0]` (기존과 동일)

> **참고**: `scripts/fetch-models.ts`는 이미 182행에서 `/gemini-(\d+)(?:\.(\d+))?/` 패턴을 사용 중이므로 버전 파싱 자체는 수정 불필요.

### Step 5-2: `scripts/fetch-models.ts` 필터링 로직 수정 (220행)

**문제**: `gemini-3.1-*` 모델이 추가되면 `maxMajor=3, maxMinor=1`이 되어,
`gemini-3-flash-preview`(major=3, minor=0)는 `isLatest=false`가 됨.
`isStable`도 false이므로 **DEFAULT_FALLBACK_ORDER 1순위 모델이 필터에서 제외**됨.

**수정**: 최신 major 버전의 모든 모델(minor 무관)을 포함하도록 변경.

```typescript
// Before: isLatest가 정확히 maxMajor.maxMinor인 경우만 true
const isLatest = major === maxMajor && minor === maxMinor;

// After: 같은 major 버전이면 모두 포함 (3.0과 3.1 모두 허용)
const isLatest = major === maxMajor;
```

### Step 6: `FallbackClient.ts`에 deprecation 경고 추가

#### 6-1. import 추가 (파일 상단)
```typescript
import { DEPRECATED_MODELS } from '../config/deprecated';
```

#### 6-2. 프로퍼티 추가 (36행 `private healthMonitor` 이후)
```typescript
  private healthMonitor: HealthMonitor | null;
  private warnedDeprecatedModels: Set<string> = new Set();  // 추가
```

#### 6-3. 생성자에 경고 코드 삽입 (77행 `this.stats = {...};` 이후, constructor 끝 이전)
```typescript
    // Check for deprecated models in fallback order
    for (const model of this.options.fallbackOrder) {
      const deprecation = DEPRECATED_MODELS.find(d => d.model === model);
      if (deprecation) {
        this.logger.warn(
          `Model "${model}" is scheduled for shutdown on ${deprecation.shutdownDate}. ` +
          `Consider migrating to "${deprecation.replacement}".`
        );
        this.warnedDeprecatedModels.add(model);
      }
    }
```

#### 6-4. `checkDeprecatedModel()` private 메서드 추가 (249행 `updateSuccessRate()` 메서드 정의 직후, `generateStream()` 직전)
```typescript
  private checkDeprecatedModel(model: GeminiModel): void {
    if (this.warnedDeprecatedModels.has(model)) return;
    const deprecation = DEPRECATED_MODELS.find(d => d.model === model);
    if (deprecation) {
      this.logger.warn(
        `Model "${model}" is scheduled for shutdown on ${deprecation.shutdownDate}. ` +
        `Consider migrating to "${deprecation.replacement}".`
      );
      this.warnedDeprecatedModels.add(model);
    }
  }
```

#### 6-5. 4개 public 메서드에서 호출 (각 메서드 첫 줄에 추가)

```typescript
// generate() (127행) - options?.model 사용
async generate(prompt: string, options?: GenerateOptions): Promise<GeminiResponse> {
  if (options?.model) {
    this.checkDeprecatedModel(options.model);
  }
  this.stats.totalRequests++;
  // ... 기존 코드 ...
}

// generateStream() (251행) - options?.model 사용
async *generateStream(prompt: string, options?: GenerateOptions): AsyncGenerator<StreamChunk> {
  if (options?.model) {
    this.checkDeprecatedModel(options.model);
  }
  this.stats.totalRequests++;
  // ... 기존 코드 ...
}

// generateContent() (380행) - request.model 사용 (GenerateContentRequest 타입)
async generateContent(request: GenerateContentRequest): Promise<GeminiResponse> {
  if (request.model) {
    this.checkDeprecatedModel(request.model);
  }
  this.stats.totalRequests++;
  // ... 기존 코드 ...
}

// generateContentStream() (510행) - request.model 사용 (GenerateContentRequest 타입)
async *generateContentStream(request: GenerateContentRequest): AsyncGenerator<StreamChunk> {
  if (request.model) {
    this.checkDeprecatedModel(request.model);
  }
  this.stats.totalRequests++;
  // ... 기존 코드 ...
}

// chat() - 추가 불필요 (내부에서 this.generate() 호출하므로 자동 적용)
```

### Step 7-1: 기존 테스트 업데이트

#### `tests/unit/models.test.ts`
```typescript
// 7행 강화: 정확한 모델 수 검증
expect(ALL_MODELS).toHaveLength(8);  // was: toBeGreaterThan(0)

// 17행 수정
expect(ALL_MODELS).toContain('gemini-3.1-pro-preview');  // was: gemini-3-pro-preview

// 17행 이후 추가: 제거된 모델 부재 검증
expect(ALL_MODELS).not.toContain('gemini-3-pro-preview');

// 26~29행: 기존 테스트 전체 교체 (it 블록 통째로 대체)
it('should not include shutdown models in DEFAULT_FALLBACK_ORDER', () => {
  expect(DEFAULT_FALLBACK_ORDER).not.toContain('gemini-3-pro-preview');
});

// import에 DEPRECATED_MODELS 추가
import { ALL_MODELS, DEFAULT_FALLBACK_ORDER } from '../../src/types/models';
import { DEPRECATED_MODELS } from '../../src/config/deprecated';

// DEPRECATED_MODELS 테스트 추가
describe('DEPRECATED_MODELS', () => {
  it('should have all deprecated models in ALL_MODELS', () => {
    DEPRECATED_MODELS.forEach(({ model }) => {
      expect(ALL_MODELS).toContain(model);
    });
  });

  it('should have all replacement models in ALL_MODELS', () => {
    DEPRECATED_MODELS.forEach(({ replacement }) => {
      expect(ALL_MODELS).toContain(replacement);
    });
  });

  it('should have valid shutdown dates', () => {
    DEPRECATED_MODELS.forEach(({ shutdownDate }) => {
      expect(Date.parse(shutdownDate)).not.toBeNaN();
    });
  });
});
```

#### `tests/unit/fallback.test.ts`
```
31행: 'gemini-2.5-flash-lite' → 'gemini-3.1-flash-lite-preview'
102행(주석): gemini-2.5-flash-lite → gemini-3.1-flash-lite-preview
238~240행: modelUsage 키 'gemini-2.5-flash-lite' → 'gemini-3.1-flash-lite-preview'
```

#### `tests/unit/health-monitor.test.ts`
```
333행: toBeGreaterThanOrEqual(7) → toBeGreaterThanOrEqual(8)
334행: 'gemini-3-pro-preview' → 'gemini-3.1-pro-preview'
```

#### `tests/integration/fallback-flow.test.ts`
```
25행: 'gemini-2.5-flash-lite' → 'gemini-3.1-flash-lite-preview'
43~47행: fallback 순서 배열의 3번째 모델 → 'gemini-3.1-flash-lite-preview'
49행: expect(response.model).toBe('gemini-2.5-flash-lite') → 'gemini-3.1-flash-lite-preview'
257~258행: 에러 context의 3번째 모델 → 'gemini-3.1-flash-lite-preview'
276~282행: allAttempts[2].model → 'gemini-3.1-flash-lite-preview'
```

### Step 7-2: 신규 테스트 추가 - Deprecation 경고 기능

**파일**: `tests/unit/deprecated.test.ts` (신규 생성)

```typescript
describe('Deprecation warnings', () => {
  it('should warn when fallbackOrder contains deprecated models', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash', 'gemini-2.5-flash'],
      logLevel: 'warn',
    });
    // gemini-2.0-flash is deprecated (shutdown: 2026-06-01)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('gemini-2.0-flash')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('2026-06-01')
    );
    warnSpy.mockRestore();
  });

  it('should warn once per model when using options.model with deprecated model', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-3-flash-preview'],  // non-deprecated
      logLevel: 'warn',
    });
    // generate()에서 deprecated 모델을 options.model로 지정
    // (API 호출은 mock 필요 — 실제 구현 시 GeminiClient mock 추가)
    // 첫 호출에서만 경고, 이후 동일 모델은 경고 없음
    expect(warnSpy).not.toHaveBeenCalled();  // constructor에서는 경고 없음
    warnSpy.mockRestore();
  });

  it('should not duplicate warnings for models already warned in constructor', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash'],  // deprecated → 생성자에서 경고
      logLevel: 'warn',
    });
    const constructorCallCount = warnSpy.mock.calls.length;
    // options.model로 동일 모델 사용 시 추가 경고 없어야 함
    // (generate() 호출 시 warnedDeprecatedModels Set에 이미 존재하므로 skip)
    expect(constructorCallCount).toBeGreaterThan(0);
    warnSpy.mockRestore();
  });

  it('should not warn when logLevel is silent', () => {
    const client = new GemBack({
      apiKey: 'test-key',
      fallbackOrder: ['gemini-2.0-flash'],
      logLevel: 'silent',
    });
    // no warnings should be emitted
  });
});
```

> **주의**: deprecation 경고가 기존 테스트에서 예상치 못한 warn 로그를 유발할 수 있음.
> 기존 테스트에서 `GemBack` 생성 시 `logLevel: 'silent'`을 사용하거나,
> logger를 mock하여 간섭 방지를 검토해야 함.
> (현재 기존 테스트 대부분은 `logLevel` 미지정 → 기본값 `'error'`이므로 warn은 출력되지 않아 영향 없음)

### Step 8: 예제 업데이트

#### `examples/custom-fallback.ts`
```
16행: 'gemini-2.0-flash' → 'gemini-3-flash-preview'
```
> `gemini-2.0-flash`는 2026-06-01 종료 예정이므로 현재 가장 성능 좋은 `gemini-3-flash-preview`로 교체.

### Step 9: 문서 업데이트

각 문서 파일의 모델명 참조를 업데이트:
- `README.md`, `README.ko.md`: 지원 모델 목록, fallbackOrder 예시
- `GEMINI.md`: fallback order 설명
- `CLAUDE.md`: 모델 목록, 모델 수, 경로 오류 수정
- `CHANGELOG.md`: v0.6.0 릴리스 노트 (BREAKING CHANGE 포함, 마이그레이션 가이드 참조)

> 상세 변경 라인은 Section 3 Step 9 표 참조.

---

## 5. 실행 순서

```
 Step 1. src/types/models.ts 수정 (GeminiModel 타입, ALL_MODELS, DEFAULT_FALLBACK_ORDER)
 Step 2. src/config/deprecated.ts 생성 (DEPRECATED_MODELS, DeprecatedModelInfo)
 Step 3. src/config/models.ts 수정 (MODEL_PRIORITY, MODEL_INFO)
 Step 4. src/index.ts export 추가
 Step 5. scripts/generate-models.ts 수정 (extractVersion 버그 수정 + targetFallbackOrder)
        scripts/fetch-models.ts 필터링 로직 수정 (220행)
 Step 6. src/client/FallbackClient.ts deprecation 경고 추가
 --- 중간 검증 ---
        npm run typecheck
        npm test
        npm run lint:fix
 Step 7. 테스트 업데이트:
        - tests/unit/models.test.ts
        - tests/unit/health-monitor.test.ts
        - tests/unit/fallback.test.ts
        - tests/integration/fallback-flow.test.ts
        - tests/unit/deprecated.test.ts (신규)
 --- 테스트 검증 ---
        npm test
 Step 8. examples/custom-fallback.ts 업데이트
 Step 9. 문서 및 버전 업데이트:
        - package.json 버전 0.5.0 → 0.6.0
        - README.md, README.ko.md, GEMINI.md, CLAUDE.md
        - CHANGELOG.md (v0.6.0 릴리스 노트 + 마이그레이션 가이드)
 --- 최종 검증 ---
        npm install (package-lock.json 자동 갱신)
        npm run prepublishOnly
```

---

## 6. 위험 요소 및 고려사항

### Breaking Changes
- `gemini-3-pro-preview` 제거는 **BREAKING CHANGE**
  - 이 모델을 `fallbackOrder`에 명시적으로 사용하던 사용자에게 타입 에러 발생
  - 해당 모델은 이미 2026-03-09에 종료되어 API 호출 자체가 불가능하므로 제거가 합리적
  - 0.x 버전이므로 semver상 minor에서 허용되나, CHANGELOG에 **BREAKING CHANGE** 라벨 명시 필수
  - 마이그레이션 가이드 제공 필수

### Deprecation 경고 설계
- **생성자**: fallbackOrder 내 deprecated 모델에 대해 1회 경고
- **요청 시**: `options.model` 또는 `request.model`로 deprecated 모델 **명시 지정** 시 모델당 1회 경고 (Set으로 중복 방지)
- **fallback 루프 중**: deprecated 모델이 자동 fallback으로 시도될 때는 경고하지 않음 (이미 생성자에서 경고 완료)
- `chat()`는 내부적으로 `generate()`를 호출하므로 별도 추가 불필요
- 기본 `logLevel`이 `'error'`이므로 warn은 기본적으로 출력되지 않음 → 기존 테스트 간섭 없음

### Preview 모델의 기본 fallback 포함
- `gemini-3-flash-preview`와 `gemini-3.1-flash-lite-preview`는 preview이지만 DEFAULT_FALLBACK_ORDER에 포함
- 이유: stable 모델들이 모두 종료 예정이라 현실적으로 불가피
- **JSDoc 주석을 현실에 맞게 수정** (기존: "stable models" → 수정: preview 포함 명시)
- 프로덕션에서는 `fallbackOrder` 명시적 지정을 **강력 권고**하는 문서 추가
- 향후 stable 버전 출시 시 즉시 교체 필요

### Auto-generated 파일과의 충돌 방지
- `DEPRECATED_MODELS`를 `src/config/deprecated.ts` **별도 파일로 분리**
- `src/types/models.ts`, `src/config/models.ts`는 auto-generated 파일 유지
- `npm run update-models` 실행 시 deprecated 파일은 영향 받지 않음
- `scripts/generate-models.ts`의 `targetFallbackOrder`도 함께 업데이트 필요

### Rate Limit 기본값
- 현재 모든 모델에 `rpm: 15, rpd: 1500` 동일 적용
- 실제로 `gemini-3-flash-preview`는 5 RPM, 3.1 preview 모델도 낮을 가능성
- **TODO**: 모델별 차등 rate limit 적용은 별도 이슈로 추적 (이번 범위에서는 주석으로 기록)

### `extractVersion()` 정규식 수정 영향
- 수정: `/gemini-(\d+)\.(\d+)/` → `/gemini-(\d+)(?:\.(\d+))?/`
- `gemini-3-flash-preview`의 priority가 1300 → 1000으로 변경됨
- `MODEL_PRIORITY`는 현재 fallback 순서에 직접 사용되지 않음 (`DEFAULT_FALLBACK_ORDER` 배열이 직접 사용)이므로 동작에 영향 없음
- `npm run update-models` 재실행 시 `config/models.ts`의 priority 값 자동 반영

### `fetch-models.ts` 필터링 로직 수정 영향
- 변경: `isLatest = major === maxMajor && minor === maxMinor` → `isLatest = major === maxMajor`
- `gemini-3-flash-preview`(major=3, minor=0)가 `gemini-3.1-*`(maxMinor=1)이 있어도 필터에 포함됨
- 부작용: 같은 major의 구버전 모델도 포함될 수 있으나, 현재 major=3 모델은 preview뿐이므로 실질적 문제 없음

---

## 7. 버전 전략

- **v0.6.0** 으로 minor version bump
- 0.x 버전이므로 semver상 minor에서 breaking change 허용
- CHANGELOG에 **BREAKING CHANGE** 섹션 포함:
  - `gemini-3-pro-preview` 타입 제거
  - `DEFAULT_FALLBACK_ORDER` 변경 (`gemini-2.5-flash-lite` → `gemini-3.1-flash-lite-preview`)

---

## 8. 마이그레이션 가이드 (CHANGELOG/README에 포함)

```markdown
### Migration from v0.5.x to v0.6.0

1. **`gemini-3-pro-preview` 사용자**:
   이 모델은 2026-03-09에 종료되었습니다. `gemini-3.1-pro-preview`로 교체하세요.
   ```typescript
   // Before
   fallbackOrder: ['gemini-3-pro-preview', 'gemini-2.5-flash']
   // After
   fallbackOrder: ['gemini-3.1-pro-preview', 'gemini-2.5-flash']
   ```

2. **기본 fallbackOrder 사용자**:
   3번째 fallback이 `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite-preview`로 변경됩니다.
   기존 동작 유지를 원하면 fallbackOrder를 명시적으로 지정하세요.

3. **Deprecation 경고 확인**:
   v0.6.0부터 종료 예정 모델 사용 시 warn 레벨 로그가 출력됩니다.
   **주의**: 기본 `logLevel`이 `'error'`이므로, deprecation 경고를 보려면 `logLevel: 'warn'` 이상으로 설정해야 합니다.
   ```typescript
   const client = new GemBack({
     apiKey: 'your-key',
     logLevel: 'warn',  // deprecation 경고를 보려면 필요
   });
   ```
   `DEPRECATED_MODELS`를 import하여 프로그래밍적으로 확인할 수도 있습니다.
   ```typescript
   import { DEPRECATED_MODELS } from 'gemback';
   ```
```
