# Free Tier 기반 자동 모델 업데이트 시스템 개발 계획서

> 작성일: 2026-03-14 (3차 리뷰 반영: 2026-03-14)
> 브랜치: (신규 생성 예정)
> 현재 버전: v0.6.0

---

## 1. 배경

Google AI Studio의 Free tier에서 제공하는 Gemini 모델 목록은 수시로 변경됩니다:
- 새 모델 출시 시 Free tier에 추가되거나
- 기존 모델이 종료되면서 Free tier에서 제거되거나
- 가격 정책 변경으로 Free/Paid 구분이 바뀔 수 있음

현재 gem-back의 `DEFAULT_FALLBACK_ORDER`는 수동으로 관리되고 있어, Free tier 변경을 즉시 반영하지 못합니다. 이를 자동화하여 항상 최신 Free tier 모델 기준으로 fallback 순서를 유지하고자 합니다.

## 2. 목표

- Google Pricing 페이지에서 Free tier 모델 목록을 자동으로 파싱
- 수동 큐레이션된 `MODEL_PRIORITY` 기반으로 DEFAULT_FALLBACK_ORDER를 자동 결정
- GitHub Actions로 매일 1회 실행, 변경 감지 시 자동 PR 생성
- 기존 `npm run update-models` 워크플로우와 통합

## 3. 데이터 소스

### Primary: Google Pricing 페이지
- URL: `https://ai.google.dev/gemini-api/docs/pricing`
- "Free of charge" 표시가 있는 모델을 Free tier로 판별
- HTML 파싱으로 모델명 추출

### 파싱 전략 (상세)

Pricing 페이지의 HTML 구조:
- 각 모델은 `<h2>` 섹션 헤더로 구분됨
- 각 모델 섹션 하위에 pricing table (`<table>`)이 존재
- "Free of charge" 텍스트는 `<td>` 셀 레벨로 표시됨 (모델 레벨이 아님)
- **Free tier 판별 기준**: input과 output 가격 행이 **모두** "Free of charge"인 모델만 Free tier로 분류

```
파싱 플로우:
1. <h2> 태그 순회 → 모델 섹션 식별
2. 각 섹션 하위 <table> 찾기
3. input/output 가격 행에서 "Free of charge" 확인
4. 양쪽 모두 Free인 경우에만 Free tier 모델로 분류
5. 모델명 추출: 섹션 헤더 또는 <code> 태그에서 gemini-* 패턴 매칭
```

### 모델명 정규화

Pricing 페이지의 모델명과 `models-data.json`의 모델명은 형식이 다를 수 있음:
- Pricing 페이지: "Gemini 3 Flash Preview" (마케팅명) 또는 `gemini-3-flash-preview` (코드명)
- API(`models-data.json`): `gemini-3-flash-preview` (models/ prefix 제거된 형태)

**정규화 로직:**
1. HTML에서 추출한 텍스트를 소문자로 변환
2. 공백을 `-`로 치환, 특수문자 제거
3. `gemini-` prefix가 없으면 추가
4. `models-data.json`의 모델명과 fuzzy matching (Levenshtein distance 또는 exact match)
5. 매칭 실패한 모델은 로그 경고 후 제외

### 참고: Rate Limits 페이지
- URL: `https://ai.google.dev/gemini-api/docs/rate-limits`
- 모델별 RPM/RPD 수치는 더 이상 공개하지 않음 (AI Studio 대시보드로 안내)
- 향후 별도 API가 제공되면 활용 가능

---

## 4. 아키텍처

```
GitHub Actions (매일 06:00 UTC cron)
  ↓
scripts/fetch-free-tier.ts
  - ai.google.dev/gemini-api/docs/pricing 페이지 fetch
  - HTML 파싱 → Free tier 모델 목록 추출
  - 모델명 정규화 + 보안 검증
  - scripts/free-tier-data.json 저장 (git 추적 대상)
  ↓
scripts/generate-models.ts (기존 스크립트 확장)
  - free-tier-data.json 읽기 (staleness 체크 포함)
  - Free tier 모델만 필터링 → MODEL_PRIORITY 기반 정렬 → 상위 3개 = DEFAULT_FALLBACK_ORDER
  - src/types/models.ts, src/config/models.ts 재생성
  ↓
npm run typecheck + npm test
  ↓
변경 감지 (git diff)
  ↓ (변경 있을 때만)
자동 PR 생성
  - 브랜치: auto/update-free-tier-models (고정명, 덮어쓰기)
  - 제목: chore: update free tier models (YYYY-MM-DD)
  - 본문: 변경 내역 (이전/이후 비교)
```

---

## 5. 변경 대상 파일

### Step 1: `scripts/types.ts` 수정

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/types.ts` | `FreeTierData` 인터페이스 추가 (기존 공유 타입 파일 패턴 준수) |

### Step 2: `scripts/fetch-free-tier.ts` (신규 생성)

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/fetch-free-tier.ts` | **(신규 파일)** Pricing 페이지 파싱, 모델명 정규화/검증, `free-tier-data.json` 저장 |

### Step 3: `scripts/free-tier-data.json` (자동 생성, git 추적)

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/free-tier-data.json` | **(자동 생성, 커밋 대상)** Free tier 모델 목록 데이터. PR 변경 감지를 위해 git 추적 필수 |

### Step 4: `scripts/model-priority-overrides.json` (신규 생성, 수동 관리)

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/model-priority-overrides.json` | **(신규 파일, 수동 관리)** `MODEL_PRIORITY`의 수동 큐레이션 override 값. `generate-models.ts`가 `calculatePriority()` 결과 대신 이 값을 우선 사용. `determineFallbackOrder()`도 이 값 기반으로 정렬. **Step 5보다 먼저 생성 필수** (generate-models.ts가 이 파일을 참조) |

### Step 5: `scripts/generate-models.ts` 수정

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/generate-models.ts` | `free-tier-data.json` 읽기 로직 추가, `determineFallbackOrder()` 함수 추가 (override 파일 기반), `generateTypesFile()` JSDoc 주석 업데이트, staleness 체크, `generateConfigFile()`에서 override 값 우선 적용. `determineFallbackOrder`와 `loadFreeTierData`는 `export` 필수 (테스트에서 import) |

### Step 6: `package.json` scripts 추가/수정

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `fetch-free-tier`, `update-free-tier` 스크립트 추가. 기존 `update-models` 스크립트를 `update-free-tier`와 동일하게 재정의 (free tier fetch 포함, GEMINI_API_KEY 없이도 동작) |

### Step 7: GitHub Actions 워크플로우 생성 + 기존 워크플로우 수정

| 파일 | 변경 내용 |
|------|-----------|
| `.github/workflows/update-free-tier-models.yml` | **(신규 파일)** 매일 cron + 수동 트리거, PR 자동 생성 |
| `.github/workflows/test.yml` | `automated` 라벨이 붙은 PR에서 E2E 테스트 skip 조건 추가 |

### Step 8: 테스트 추가

| 파일 | 변경 내용 |
|------|-----------|
| `tests/unit/fetch-free-tier.test.ts` | **(신규 파일)** HTML 파싱 로직 단위 테스트 |
| `tests/fixtures/pricing-page-mock.html` | **(신규 파일)** 테스트용 mock HTML fixture |
| `tests/fixtures/pricing-page-partial-mock.html` | **(신규 파일)** 1개 free 모델만 포함한 partial mock (< 2개 가드 테스트용) |

### Step 9: 문서 및 버전 업데이트

| 파일 | 변경 내용 |
|------|-----------|
| `README.md` | Free tier 자동 업데이트 기능 소개 추가 |
| `README.ko.md` | 한국어 README 동기화 |
| `CLAUDE.md` | 자동화 스크립트 설명 추가 |
| `GEMINI.md` | 워크플로우 설명 추가 |
| `CHANGELOG.md` | v0.7.0 섹션 추가 (Added: Free tier 자동 업데이트 시스템) |
| `package.json` | version `0.6.0` → `0.7.0` |

---

## 6. 상세 구현 계획

### Step 1: `scripts/types.ts` 수정

```typescript
// 기존 타입들 (ModelMetadata, ProcessedModel, ModelClassification) 이후에 추가

export interface FreeTierData {
  timestamp: string;          // ISO date string
  source: string;             // pricing page URL
  freeModels: string[];       // Free tier 모델명 배열 (정규화된 API 형식)
}
```

### Step 2: `scripts/fetch-free-tier.ts` (신규 생성)

```typescript
import type { FreeTierData } from './types';

// === 모델명 보안 검증 ===
const MODEL_NAME_PATTERN = /^gemini-[\d.]+-[a-z]+(-(preview|lite|pro|flash|exp|experimental))*$/;

export function validateModelName(name: string): boolean {
  return MODEL_NAME_PATTERN.test(name);
}

// === 모델 제외 필터 ===
// fetch-models.ts의 기존 패턴을 미러링
const EXCLUDE_PATTERNS = [
  /embedding/i,
  /-image/i,
  /-tts/i,
  /native-audio/i,
  /live-/i,
  /robotics/i,
  /computer-use/i,
  /^gemma-/i,
  /^imagen/i,
  /^veo/i,
  /^learnlm/i,
  /-\d{3,}$/,        // 고정 버전 (-001, -002)
  /-\d{2}-\d{4}$/,   // 날짜 버전 (-05-2026)
  /-latest$/,         // alias
];

function shouldExclude(modelName: string): boolean {
  return EXCLUDE_PATTERNS.some(p => p.test(modelName));
}

// === HTML 파싱 (export 필수 - 테스트에서 import) ===
export function parsePricingHtml(html: string): string[] {
  // 1. <h2> 섹션별로 모델 식별
  // 2. 각 섹션의 pricing table에서 input/output 행이 모두 "Free of charge"인지 확인
  // 3. 모델명 추출 및 정규화 (마케팅명 → API 형식)
  // 4. 보안 검증 (validateModelName)
  // 5. 제외 필터 적용 (shouldExclude)
  // 6. 안전장치: 결과 0개 → throw, 결과 < 2개 → throw
  // 반환: 정규화된 모델명 배열
}

// === 안전장치 ===
// - 파싱 결과 0개 → 에러 throw (페이지 구조 변경 의심)
// - 파싱 결과 < 2개 → 에러 throw (부분 파싱 실패 의심)
// - 알려진 모델 존재 확인: freeModels 중 최소 1개가 기존 free-tier-data.json과 겹치는지 검증
//   (최초 실행 시에는 이 검증 skip)
// - fetch 실패 → 기존 free-tier-data.json 유지, 프로세스 에러 코드 반환

// === 결과 저장 ===
// scripts/free-tier-data.json에 FreeTierData 형식으로 저장
```

**출력 예시 (`scripts/free-tier-data.json`):**
```json
{
  "timestamp": "2026-03-14T06:00:00.000Z",
  "source": "https://ai.google.dev/gemini-api/docs/pricing",
  "freeModels": [
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite"
  ]
}
```

### Step 3: `scripts/free-tier-data.json` 최초 생성

Step 2에서 구현한 `fetch-free-tier.ts`를 실행하여 최초 데이터 파일을 생성합니다.

```bash
npm run fetch-free-tier
```

생성된 `scripts/free-tier-data.json`은 git에 커밋합니다 (PR 변경 감지를 위해 추적 필수).
이후 GitHub Actions workflow가 이 파일의 변경을 감지하여 자동 PR을 생성합니다.

### Step 4-5: `scripts/model-priority-overrides.json` + `scripts/generate-models.ts` 수정

**핵심 변경 1: `MODEL_PRIORITY` 보존을 위한 override 파일 도입 (Step 4)**

> **문제**: `generate-models.ts`의 `generateConfigFile()`은 `calculatePriority()`로 `MODEL_PRIORITY`를
> 매번 재생성함. preview 모델에 +1000 패널티가 적용되어, 수동 큐레이션 값(예: `gemini-3-flash-preview: 0`)이
> 덮어써짐. `determineFallbackOrder()`가 이 파일의 `MODEL_PRIORITY`를 import하면,
> 첫 실행 후부터 fallback 순서가 역전됨.
>
> **해결**: `scripts/model-priority-overrides.json` 파일을 도입하여, `generateConfigFile()`이
> `calculatePriority()` 결과 대신 override 값을 우선 적용하도록 변경.
> `determineFallbackOrder()`도 이 override 파일을 직접 읽어 정렬에 사용 (순환 의존 방지).

**`scripts/model-priority-overrides.json` (신규, 수동 관리):**
```json
{
  "_comment": "Manual priority overrides. Lower = higher priority. Used by generate-models.ts and determineFallbackOrder().",
  "gemini-3-flash-preview": 0,
  "gemini-2.5-flash": 1,
  "gemini-2.5-flash-lite": 2,
  "gemini-3.1-flash-lite-preview": 10,
  "gemini-3.1-pro-preview": 5,
  "gemini-2.5-pro": 100,
  "gemini-2.0-flash": 200,
  "gemini-2.0-flash-lite": 210
}
```

**핵심 변경 2: `determineFallbackOrder()` - override 파일 직접 사용 (Step 5)**

> **순환 의존 방지**: `generate-models.ts`가 `src/config/models.ts`를 import하면,
> 자신이 생성하는 파일을 읽는 순환 구조가 됨. 대신 `model-priority-overrides.json`을
> 직접 읽어서 정렬에 사용함.

```typescript
import type { FreeTierData } from './types';

type PriorityOverrides = Record<string, number>;

function loadPriorityOverrides(): PriorityOverrides {
  const filePath = path.join(__dirname, 'model-priority-overrides.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    console.warn('model-priority-overrides.json not found, using calculatePriority() fallback');
    return {};
  }
}

// 108~112행의 기존 하드코딩 교체
export function determineFallbackOrder(
  allModelNames: string[],
  freeTierModels: string[] | null
): string[] {
  // 1. free-tier-data.json이 없거나 비어있으면 기존 하드코딩 사용 (하위 호환)
  if (!freeTierModels || freeTierModels.length === 0) {
    console.warn('Using hardcoded fallback order (free-tier-data.json unavailable)');
    return [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite-preview'
    ];
  }

  // 2. allModelNames(models-data.json 기반)과 freeTierModels의 교집합
  const freeAndAvailable = allModelNames.filter(name => freeTierModels.includes(name));

  if (freeAndAvailable.length === 0) {
    console.warn('No free tier models found in models-data.json, using hardcoded fallback');
    return [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite-preview'
    ];
  }

  // 3. override 파일 기반 정렬 (낮은 값 = 높은 우선순위)
  //    override에 없는 모델은 9999로 처리
  const overrides = loadPriorityOverrides();
  freeAndAvailable.sort((a, b) => {
    const priorityA = overrides[a] ?? 9999;
    const priorityB = overrides[b] ?? 9999;
    return priorityA - priorityB;
  });

  // 4. 상위 3개 선택
  return freeAndAvailable.slice(0, 3);
}
```

**`generateConfigFile()` 수정: override 값 우선 적용**
```typescript
// generateConfigFile() 내 MODEL_PRIORITY 생성 시:
const overrides = loadPriorityOverrides();

// 각 모델의 priority 결정:
const priority = overrides[model.name] ?? calculatePriority(model.name, model.classification);
```

**free-tier-data.json 읽기 + staleness 체크:**
```typescript
const STALENESS_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48시간

export function loadFreeTierData(): string[] | null {
  const filePath = path.join(__dirname, 'free-tier-data.json');
  try {
    const data: FreeTierData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!data.freeModels || data.freeModels.length === 0) {
      console.warn('free-tier-data.json has no models, using hardcoded fallback');
      return null;
    }

    // staleness 체크
    const age = Date.now() - new Date(data.timestamp).getTime();
    if (age > STALENESS_THRESHOLD_MS) {
      console.warn(
        `free-tier-data.json is stale (${Math.round(age / 3600000)}h old). ` +
        'Run "npm run fetch-free-tier" to refresh.'
      );
    }

    return data.freeModels;
  } catch {
    console.warn('free-tier-data.json not found, using hardcoded fallback');
    return null;
  }
}
```

**`generateTypesFile()` JSDoc 주석 업데이트 (144~147행):**
```typescript
// Before (JSDoc block comment):
/**
 * Default fallback order for stable models
 * Preview and experimental models must be explicitly specified
 */

// After (JSDoc block comment 유지):
/**
 * Default fallback order (auto-determined from free tier models).
 * Sorted by model-priority-overrides.json (lower = higher priority).
 * For production use, explicitly specify your own fallbackOrder.
 */
```

### Step 6: `package.json` scripts 추가/수정

```json
{
  "scripts": {
    "fetch-free-tier": "tsx scripts/fetch-free-tier.ts",
    "update-free-tier": "npm run fetch-free-tier && (npm run fetch-models || true) && npm run generate-models && npm run lint:fix",
    "update-models": "npm run fetch-free-tier && (npm run fetch-models || true) && npm run generate-models && npm run lint:fix"
  }
}
```

> **주의**: 기존 `update-models` 스크립트를 `update-free-tier`와 동일하게 재정의합니다.
> 이전: `fetch-models && generate-models && lint:fix` (free tier 미반영, GEMINI_API_KEY 필수)
> 이후: `fetch-free-tier && (fetch-models || true) && generate-models && lint:fix`
>
> 이렇게 하면:
> - `npm run update-models`와 `npm run update-free-tier`가 동일하게 동작
> - 기존 문서/가이드에서 `update-models`를 참조하는 곳이 자동으로 호환
> - `GEMINI_API_KEY`가 없어도 `fetch-models` 실패를 허용하여 graceful degradation

### Step 7: GitHub Actions 워크플로우

**파일**: `.github/workflows/update-free-tier-models.yml`

```yaml
name: Update Free Tier Models

on:
  schedule:
    - cron: '0 6 * * *'  # 매일 06:00 UTC (한국시간 15:00)
  workflow_dispatch:        # 수동 실행 지원

permissions:
  contents: write
  pull-requests: write

jobs:
  update-models:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Fetch free tier models from pricing page
        run: npm run fetch-free-tier

      - name: Fetch models from Gemini API
        run: npm run fetch-models
        continue-on-error: true  # GEMINI_API_KEY 미설정 시 기존 models-data.json 유지
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Generate model code and lint
        run: npm run generate-models && npm run lint:fix

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm test

      - name: Get current date
        id: date
        run: echo "date=$(date +'%Y-%m-%d')" >> $GITHUB_OUTPUT

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v7
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          branch: auto/update-free-tier-models
          commit-message: 'chore: update free tier models (${{ steps.date.outputs.date }})'
          title: 'chore: update free tier models (${{ steps.date.outputs.date }})'
          body: |
            ## Summary
            - Automatically detected changes in Gemini API free tier model availability
            - Updated `DEFAULT_FALLBACK_ORDER` based on current free tier models
            - Source: https://ai.google.dev/gemini-api/docs/pricing

            ## Changes
            - `scripts/free-tier-data.json`: Updated free tier model list
            - `src/types/models.ts`: Updated model types and fallback order (if changed)
            - `src/config/models.ts`: Updated model metadata (if changed)

            ## Verification
            - [x] `npm run typecheck` passed
            - [x] `npm test` passed

            > This PR was automatically generated by the Update Free Tier Models workflow.
          labels: |
            automated
            models-update
          delete-branch: true
```

**주요 변경점 (리뷰 반영):**
- `peter-evans/create-pull-request@v6` → `@v7`
- 브랜치명: `run_id` 기반 → 고정명 `auto/update-free-tier-models` (PR 누적 방지, 동일 브랜치 덮어쓰기)
- PR title: `github.event.repository.updated_at` → `steps.date.outputs.date` (정확한 날짜)
- `npm run typecheck` 단계 추가
- `update-models`를 `fetch-models`(continue-on-error) + `generate-models && lint:fix`로 분리 (GEMINI_API_KEY 미설정 시에도 generate 단계 확실히 실행)

> **참고**: `MODEL_NAME_PATTERN` 정규식은 현재 8개 모델에 대해 검증됨.
> 향후 새 모델 명명 규칙(예: `gemini-2.5-flash-8b`)이 등장하면 패턴 업데이트 필요.

**기존 워크플로우와의 상호작용:**
- `test.yml`은 master PR 대상으로 E2E 테스트 실행 (실 API 호출)
- auto PR에 `automated` 라벨 추가 → `test.yml`에서 라벨 조건으로 E2E skip 가능
- 또는 `test.yml`의 트리거 조건에 `paths` 필터 추가하여 `scripts/` 변경만 있는 PR은 E2E skip

### Step 8: 테스트

**파일**: `tests/unit/fetch-free-tier.test.ts`

**테스트 전략:**
- `tests/fixtures/pricing-page-mock.html`에 실제 Pricing 페이지 구조를 모방한 mock HTML 저장
- 파싱 로직을 순수 함수로 분리하여 HTML string 입력 → 모델명 배열 출력 형태로 테스트
- mock HTML은 첫 구현 시 실제 페이지에서 추출하여 fixture로 저장

```typescript
import { parsePricingHtml, validateModelName } from '../../scripts/fetch-free-tier';
import fs from 'fs';
import path from 'path';

const mockHtml = fs.readFileSync(
  path.join(__dirname, '../fixtures/pricing-page-mock.html'), 'utf-8'
);

describe('fetch-free-tier: HTML parsing', () => {
  it('should extract free tier models from pricing HTML', () => {
    const models = parsePricingHtml(mockHtml);
    expect(models).toContain('gemini-2.5-flash');
    expect(models).toContain('gemini-3-flash-preview');
    expect(models.length).toBeGreaterThanOrEqual(2);
  });

  it('should only include models where both input and output are free', () => {
    const models = parsePricingHtml(mockHtml);
    // gemini-3.1-pro-preview는 paid only
    expect(models).not.toContain('gemini-3.1-pro-preview');
    // gemini-2.5-pro는 paid only
    expect(models).not.toContain('gemini-2.5-pro');
  });

  it('should exclude non-LLM models (embedding, image, TTS, etc)', () => {
    const models = parsePricingHtml(mockHtml);
    models.forEach(m => {
      expect(m).not.toMatch(/embedding|image|tts|audio|robotics|computer-use|gemma|imagen|veo/i);
    });
  });

  it('should exclude date-versioned and alias models', () => {
    const models = parsePricingHtml(mockHtml);
    models.forEach(m => {
      expect(m).not.toMatch(/-\d{3,}$/);
      expect(m).not.toMatch(/-\d{2}-\d{4}$/);
      expect(m).not.toMatch(/-latest$/);
    });
  });

  it('should throw on empty parse results (page structure change)', () => {
    expect(() => parsePricingHtml('<html><body>No models</body></html>'))
      .toThrow();
  });

  it('should throw when fewer than 2 models parsed (partial failure)', () => {
    // tests/fixtures/pricing-page-partial-mock.html: 1개 free 모델만 포함
    const partialHtml = fs.readFileSync(
      path.join(__dirname, '../fixtures/pricing-page-partial-mock.html'), 'utf-8'
    );
    // 0개 가드와는 다른 분기: 파싱은 성공하지만 결과 < 2개이므로 throw
    expect(() => parsePricingHtml(partialHtml)).toThrow(/fewer than 2/i);
  });
});

describe('fetch-free-tier: model name validation', () => {
  it('should accept valid model names', () => {
    expect(validateModelName('gemini-2.5-flash')).toBe(true);
    expect(validateModelName('gemini-3-flash-preview')).toBe(true);
    expect(validateModelName('gemini-3.1-flash-lite-preview')).toBe(true);
  });

  it('should reject malicious or invalid model names', () => {
    expect(validateModelName('../../src/something')).toBe(false);
    expect(validateModelName('gemini-3-flash; rm -rf /')).toBe(false);
    expect(validateModelName('')).toBe(false);
    expect(validateModelName('not-a-gemini-model')).toBe(false);
  });
});

describe('generate-models: free tier integration', () => {
  it('should use free tier models for DEFAULT_FALLBACK_ORDER', () => {
    // free-tier-data.json 기반 fallback 생성 검증
  });

  it('should fallback to hardcoded order when free-tier-data.json missing', () => {
    // 파일 없을 때 하위 호환 검증
  });

  it('should select top 3 models by MODEL_PRIORITY from free tier list', () => {
    // MODEL_PRIORITY 정렬 후 상위 3개 선택 검증
    // gemini-3-flash-preview (priority 0)가 gemini-2.5-flash (priority 1)보다 우선
  });

  it('should exclude paid-only models from fallback order', () => {
    // gemini-3.1-pro-preview, gemini-2.5-pro 등 유료 모델 제외 검증
  });

  it('should warn when free-tier-data.json is stale (>48h)', () => {
    // staleness 경고 검증
  });

  it('should throw when parsed models have zero overlap with existing free-tier-data', () => {
    // 알려진 모델 부재 시 에러 throw 검증 (Section 8 교차 검증 시나리오)
  });
});
```

### Step 9: 문서 및 버전 업데이트

- `package.json`: `"version": "0.6.0"` → `"0.7.0"`
- `README.md`, `README.ko.md`: 지원 모델 섹션에 Free tier 자동 업데이트 소개
- `CLAUDE.md`: `scripts/fetch-free-tier.ts` 설명, `npm run update-free-tier` 워크플로우 추가
- `GEMINI.md`: Common Tasks에 Free tier 업데이트 가이드 추가
- `CHANGELOG.md`: v0.7.0 섹션 추가
  - Added: Free tier 자동 모델 업데이트 시스템
  - Added: GitHub Actions 자동 PR 생성 워크플로우
  - Added: `npm run fetch-free-tier`, `npm run update-free-tier` 스크립트

---

## 7. 실행 순서

```
Step 1.   scripts/types.ts 수정
          - FreeTierData 인터페이스 추가
Step 2.   scripts/fetch-free-tier.ts 신규 생성
          - HTML fetch + 파싱 로직 (parsePricingHtml, validateModelName 등 export)
          - 모델명 정규화 + 보안 검증
Step 3.   scripts/free-tier-data.json 최초 생성
          - npm run fetch-free-tier 실행하여 생성
          - git 추적 대상 (커밋)
Step 4.   scripts/model-priority-overrides.json 신규 생성
          - 현재 src/config/models.ts의 MODEL_PRIORITY 수동 큐레이션 값 추출
Step 5.   scripts/generate-models.ts 수정
          - loadFreeTierData() 함수 추가 (export, staleness 체크 포함)
          - determineFallbackOrder() 함수 추가 (export, override 파일 기반)
          - loadPriorityOverrides() 함수 추가
          - generateConfigFile()에서 override 값 우선 적용
          - targetFallbackOrder를 동적으로 결정하도록 변경
          - generateTypesFile() JSDoc 주석 업데이트
Step 6.   package.json scripts 추가
          - fetch-free-tier, update-free-tier
--- 중간 검증 ---
          npm run fetch-free-tier (실제 페이지 파싱 테스트)
          npm run update-free-tier (전체 파이프라인 테스트)
          npm run typecheck
          npm test
Step 7.   .github/workflows/update-free-tier-models.yml 생성
          .github/workflows/test.yml 수정 (automated 라벨 PR E2E skip 조건 추가)
Step 8.   tests/fixtures/pricing-page-mock.html 생성
          tests/fixtures/pricing-page-partial-mock.html 생성
          tests/unit/fetch-free-tier.test.ts 신규 생성
--- 테스트 검증 ---
          npm test
Step 9.   문서 및 버전 업데이트
          - package.json 버전 0.6.0 → 0.7.0
          - README.md, README.ko.md, CLAUDE.md, GEMINI.md
          - CHANGELOG.md (v0.7.0 릴리스 노트)
--- 최종 검증 ---
          npm run prepublishOnly
```

---

## 8. 에러 처리 및 안전장치

| 상황 | 처리 |
|------|------|
| Pricing 페이지 fetch 실패 (네트워크/5xx) | 최대 3회 retry (exponential backoff), 실패 시 기존 `free-tier-data.json` 유지, 프로세스 에러 코드 반환 |
| 페이지 구조 변경 (파싱 결과 0개) | 에러 throw, 업데이트 중단, workflow 실패 표시 |
| 부분 파싱 실패 (결과 < 2개) | 에러 throw, 업데이트 중단 (정상이라면 최소 2개 이상의 free 모델 존재) |
| 알려진 모델 부재 | 기존 `free-tier-data.json`과 교차 검증, 겹치는 모델이 0개면 에러 throw (최초 실행 시 skip) |
| 모델명 보안 검증 실패 | `MODEL_NAME_PATTERN` 불일치 → 해당 모델 제외, 로그 경고 |
| 파싱 결과가 기존과 동일 | PR 생성 안 함 (`peter-evans/create-pull-request`가 변경 없으면 자동 skip) |
| `free-tier-data.json` 없음 (로컬 개발) | 기존 하드코딩된 `targetFallbackOrder` 사용 (하위 호환) |
| `free-tier-data.json` stale (>48h) | 경고 로그 출력, 기존 데이터로 계속 진행 |
| `GEMINI_API_KEY` secret 미설정 | `fetch-models` 단계 `continue-on-error: true`로 실패 허용, 기존 `models-data.json` 유지. 이후 `generate-models` + `lint:fix`는 정상 실행 |
| 테스트 또는 typecheck 실패 | PR 생성 안 함 (workflow에서 test/typecheck 단계가 create-pull-request 전에 실행) |
| auto PR이 기존 test.yml E2E 트리거 | `automated` 라벨로 구분, test.yml에 라벨/경로 조건 추가하여 E2E skip |

**GitHub Actions 실패 알림:**
- GitHub는 기본적으로 scheduled workflow 실패 시 repo 소유자에게 이메일 알림 전송
- 추가 알림이 필요하면 Settings → Notifications에서 설정

---

## 9. 위험 요소 및 고려사항

### HTML 파싱 안정성
- Google Pricing 페이지는 정적 HTML (SPA 아님)이지만, 주기적으로 구조 변경 가능
- "Free of charge"는 셀 레벨 표시이므로, 단순 텍스트 검색이 아닌 DOM 구조 기반 파싱 필요
- **완화책**: 최소 모델 수 가드 + 알려진 모델 존재 확인 + workflow 실패 시 이메일 알림

### Priority 시스템과의 불일치 (해결됨)
- `calculatePriority()`는 preview 모델에 +1000 패널티 부여 (안정성 우선)
- `MODEL_PRIORITY`는 수동 큐레이션으로 preview 모델을 최우선 배치 (성능 우선)
- **결정**: `scripts/model-priority-overrides.json` 별도 파일로 수동 큐레이션 값을 관리
- `determineFallbackOrder()`는 override 파일을 직접 읽어 정렬 (순환 의존 없음)
- `generateConfigFile()`도 override 값이 있으면 `calculatePriority()` 대신 사용
- **주의**: 새 모델 추가 시 override 파일에도 priority 값을 추가해야 함. 없으면 `calculatePriority()` 결과 사용 (preview 패널티 적용됨)

### 모델명 매칭
- Pricing 페이지의 모델명 형식과 API의 모델명 형식이 다를 수 있음
- **완화책**: 정규화 로직 + `models-data.json`과의 교차 검증 + 매칭 실패 시 경고 로그

### Supply Chain 보안
- 외부 HTML을 fetch하여 생성된 데이터가 TypeScript 소스에 반영됨
- **완화책**: `MODEL_NAME_PATTERN` 정규식으로 모든 모델명 검증, PR 리뷰를 통한 human-in-the-loop

### 기존 test.yml과의 상호작용
- auto PR이 master 대상으로 생성되면 `test.yml`의 E2E 테스트가 트리거됨
- E2E 테스트는 실 Gemini API를 호출하므로 rate limit 위험
- **완화책**: `test.yml`에 `if: !contains(github.event.pull_request.labels.*.name, 'automated')` 조건 추가

---

## 10. 버전 전략

- **v0.7.0**으로 minor version bump
- 0.x 버전이므로 semver상 minor에서 기능 추가 허용
- Breaking changes 없음 (기존 동작은 하위 호환 유지)
- CHANGELOG에 Added 섹션 포함

---

## 11. 향후 확장 가능성

- **Rate Limit 자동 감지**: Google이 향후 API로 모델별 RPM/RPD를 제공하면, `free-tier-data.json`에 rate limit 정보도 포함하여 `RateLimitTracker` 기본값을 자동 업데이트
- **Deprecated 모델 자동 감지**: Pricing 페이지에서 "Deprecated" 표시를 파싱하여 `src/config/deprecated.ts` 자동 업데이트
- **Slack/Discord 알림**: 모델 변경 감지 시 팀 채널에 알림 전송
- **다중 소스 교차 검증**: Pricing 페이지 + API `v1beta/models` 엔드포인트 결과를 교차 검증하여 정확도 향상
- **MODEL_PRIORITY 자동 큐레이션**: Free tier 모델의 실제 벤치마크 성능 데이터를 기반으로 priority 자동 조정
