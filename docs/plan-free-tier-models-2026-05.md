# Free Tier 모델 지원 업데이트 v0.7.0 개발 계획서

> 작성일: 2026-05-28
> 기준 데이터: 2026-05-28 AI Studio 대시보드 스냅샷
> 현재 버전: v0.6.0
> 관련 문서: [plan-auto-free-tier-update.md](./plan-auto-free-tier-update.md) (장기 자동화), [plan-update-gemini-models-2026-03.md](./plan-update-gemini-models-2026-03.md) (직전 v0.6.0)

---

## 1. 배경

2026-05-28 기준 Google AI Studio Free tier에서 제공되는 Gemini 모델 quota를 확인한 결과, 현재 gem-back 구현과 다음과 같은 갭이 존재한다:

- **`Gemini 3.5 Flash` 신규 모델**이 free-tier에 출시되었으나 `ALL_MODELS`에 없음
- `RateLimitTracker`의 모델별 기본 한도가 일괄 `{ rpm: 15, rpd: 1500 }`인데, 실제 free-tier 모델별로 크게 다름 (5–15 RPM, 20–500 RPD)
- **TPM (Tokens Per Minute)** 제한이 모든 free-tier 모델에 250K로 존재하나, 현재 트래커는 RPM/RPD만 추적
- 현재 지원 모델 중 `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3.1-pro-preview`는 더 이상 free-tier에 포함되지 않음 (유료 전용)

장기적으로는 [plan-auto-free-tier-update.md](./plan-auto-free-tier-update.md)의 자동 파싱 시스템이 본 작업을 대체하지만, 그 시스템 출시 전까지의 사용자 경험을 개선하기 위해 본 스냅샷을 v0.7.0에 즉시 반영한다.

## 2. 2026-05-28 Free Tier 스냅샷

| 사용자 표기 | RPM | TPM | RPD | Canonical 모델 ID (Phase 1 확정 — 2026-05-29) | 현재 ALL_MODELS |
|---|---|---|---|---|---|
| Gemini 2.5 Flash | 5 | 250K | 20 | `gemini-2.5-flash` | ✅ |
| Gemini 2.5 Flash Lite | 10 | 250K | 20 | `gemini-2.5-flash-lite` | ✅ |
| Gemini 3 Flash | 5 | 250K | 20 | `gemini-3-flash-preview` (preview 유지) | ✅ |
| Gemini 3.1 Flash Lite | 15 | 250K | 500 | **`gemini-3.1-flash-lite`** (stable 출시; preview도 공존) | preview만 있음 → stable 추가 필요 |
| **Gemini 3.5 Flash** | **5** | **250K** | **20** | **`gemini-3.5-flash`** (preview suffix 없음) | **❌ 신규 추가 필요** |

Free-tier 미제공 (현재 지원 중이지만 quota 0):
- `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3.1-pro-preview`

**Phase 1 (`npm run fetch-models`) 실행 결과 (2026-05-29)**:
- API 응답 13개 모델 (이전 7개 → 13개로 증가). 사라진 모델 없음.
- 신규 발견: stable `gemini-3.1-flash-lite`, `gemini-3-pro-preview` (v0.6.0에서 deprecated 처리), `gemini-3.1-flash-tts-preview`, `gemini-3.1-pro-preview-customtools`, `gemini-3.5-flash`.
- 결정:
  - `gemini-3.1-flash-lite` (stable)을 **DEFAULT_FALLBACK_ORDER에 채택**, preview는 `replaced_by_newer`로 deprecated.
  - 특수 variant (`*-tts-preview`, `*-customtools`)는 일반 chat 사용 패턴에 부적합 → `ALL_MODELS`에서 제외 (generate-models에서 필터링).
  - `gemini-3-pro-preview`는 v0.6.0의 deprecation 결정 유지 (3.1-pro-preview로 대체됨).

## 3. 목표 및 비목표

### 목표
1. 신규 모델 `gemini-3.5-flash`(이름은 fetch-models로 확정)를 `ALL_MODELS`와 `MODEL_INFO`에 추가
2. **API에서 사라진 모델을 `ALL_MODELS`에서 제거** (예: 3.5 출시로 3.1 일부가 사라질 가능성; Phase 1에서 확정). 기존 deprecation 시스템과 결합해 안전 전환 절차를 따른다.
3. `RateLimitTracker`가 모델별 정확한 RPM/RPD를 사용하도록 모델별 default limits 테이블 추가
4. **TPM 추적 추가** — 250K TPM 한도 예측 및 경고
5. `DEFAULT_FALLBACK_ORDER`를 free-tier 친화적으로 재구성 (RPD 합산 최대화)
6. Free-tier에서 빠진 모델에 대해 사용 시 런타임 경고 (deprecation 시스템과 별도, "no free tier" 라벨)

> **본 plan은 breaking change를 포함한다.**
>
> - **확정 (모든 v0.7.0 출시에 적용)**: `DeprecatedModelInfo.reason` 타입 narrowing (string → string-literal union).
> - **조건부 (Phase 1이 사라진 모델을 발견한 경우에만)**: `GeminiModel` 타입 union에서 리터럴 제거, `ALL_MODELS` 배열 축소. 2026-05-28 스냅샷 시점에는 아직 어느 모델도 제거 대상으로 확정되지 않음 (Appendix B 참조).
>
> 어느 경우든 0.x semver 컨벤션상 minor 0.7.0에 허용되지만 (관행: 0.x에서는 minor가 breaking 가능), CHANGELOG에 `BREAKING CHANGES` 섹션, README의 "Migrating from v0.6 to v0.7" 섹션을 반드시 동반한다. §5 Phase 7 및 §8 Rollback 참조.

### 비목표
- 자동 파싱 시스템 구축 (별도 plan-auto-free-tier-update.md에서 다룸)
- 유료 모델의 enterprise quota 반영
- Paid tier user를 위한 별도 fallback chain (지금은 옵션으로 외부 주입만 권장)

## 4. DEFAULT_FALLBACK_ORDER (Phase 1 확정 ID 기준)

Free-tier 사용자의 일일 처리량 최대화 관점에서, RPD 합산이 가장 큰 조합을 우선한다:

```
1. gemini-3.1-flash-lite     # 500 RPD — stable, 일일 quota 대부분
2. gemini-3.5-flash          # 20 RPD — 최신·최고 품질 (신규)
3. gemini-3-flash-preview    # 20 RPD — 백업 (stable 미출시)
```

대안으로 검토:
- **A) 품질 우선 (3.5 Flash → 3 Flash → 3.1 Flash Lite)**: 첫 호출 품질은 좋으나 20 RPD를 빠르게 소진해 fallback에 의존하게 됨.
- **B) RPD 우선 (제안안)**: 일일 사용량이 많은 챗봇·배치 사용자에게 유리. 첫 호출이 가장 가벼운 모델이라 품질은 살짝 낮을 수 있음.
- 본 plan은 라이브러리 자체 기본값으로 B를 택하고, README에 "품질이 중요하면 명시적 `fallbackOrder` 권장"을 문서화한다.

## 5. 변경 대상

### Phase 1: 모델 ID 확정 및 사라진 모델 감지 (수동 1회, 블로킹)
- [ ] `npm run fetch-models` 실행 후 `scripts/models-data.json` diff 확인
- [ ] "Gemini 3.5 Flash"의 canonical API ID 확정 (`gemini-3.5-flash` vs `gemini-3.5-flash-preview` 등)
- [ ] `-preview` suffix가 떨어진 모델 (3 Flash, 3.1 Flash Lite 등) 식별
- [ ] **API 응답에 더 이상 존재하지 않는 모델 식별 (= "사라진 모델")**. 확정은 `models-data.json` diff에서 `name` 키 비교로 수행.
- [ ] 사라진 모델을 §Phase 1.5의 제거 워크플로우로 넘김

**Abort criteria** (release 차단 조건):
- `gemini-3.5-flash` (또는 그 변형 ID)이 API 응답에 없으면 **본 릴리스 보류**. v0.7.0의 핵심 변경이므로 신규 모델 없이 출시 무의미. 차주 fetch까지 대기.
- 사용자 표 free-tier 모델 5개 중 2개 이상이 API에서 사라진 경우 **수동 리뷰 후 재계획**. AI Studio 대시보드 스크린샷과 API 응답의 불일치는 Google 측 lag일 수 있음.
- 위 두 조건 모두 발생 시 본 plan 폐기, 새 스냅샷 plan 작성.
- Go/No-go 결정은 maintainer 단독 권한.

### Phase 1.5: 사라진 모델 제거 (Removal Pipeline)

**정책**: API에서 사라진 모델은 다음 절차에 따라 제거한다. "free-tier 미제공" (API는 있으나 quota 0) 처리와 명확히 구분한다.

| 상태 | API 존재 | Free Tier | 처리 |
|---|---|---|---|
| Active free-tier | ✅ | ✅ | `ALL_MODELS`·`FREE_TIER_LIMITS` 포함 |
| Paid-only | ✅ | ❌ | `ALL_MODELS` 유지 + 런타임 경고 (§Phase 5) |
| **Removed from API** | **❌** | **N/A** | **`DEPRECATED_MODELS`로 1버전 격리 → 다음 메이저에서 `ALL_MODELS`에서 삭제** |

**전환 절차** (사라진 모델 X가 Phase 1에서 식별된 경우):
1. `src/config/deprecated.ts`의 `DEPRECATED_MODELS`에 X 항목 추가 — `shutdownDate`는 Phase 1 `fetch-models` 응답에서 X가 사라진 것이 확인된 날짜 (**ISO `YYYY-MM-DD` 포맷**, 예: `'2026-05-28'`. 기존 항목과 동일 포맷 유지), `replacement`는 후속 모델 (예: `gemini-3.5-flash`), `reason: 'removed_from_api'`
2. `scripts/generate-models.ts`가 X를 출력에서 제외하도록 `npm run update-models` 실행 → `GeminiModel` 타입 union과 `ALL_MODELS` 배열에서 X 자동 제거. **TypeScript 사용자에게 compile error 유발 — semver breaking, §3 경고 참조**
3. `FallbackClient` 호출 시 사용자가 명시적으로 사라진 모델을 `fallbackOrder`에 지정한 경우 (런타임 string 캐스팅 등):
   - v0.7.0: 첫 호출에서 `logger.error` 1회 + 즉시 다음 모델로 fallback (시도조차 하지 않음, `AttemptRecord.reason = 'removed_from_api'` 기록)
   - 호환성 shim 없음 — 사라진 모델이므로 시도해도 404
4. `DEPRECATED_MODELS` export는 유지되어 사용자가 자신의 코드에서 마이그레이션 가이드를 조회 가능
5. `REMOVED_MODELS: readonly string[]` 상수를 `src/index.ts`에서 신규 export — 다운스트림이 ALL_MODELS 축소를 감지할 수 있는 명시적 채널. **타입이 `string[]`인 이유**: 제거된 모델은 정의상 `GeminiModel` union에 더 이상 존재하지 않으므로 literal union으로 표현 불가; raw string으로 두고 README에 "ALL_MODELS 차집합 감지용"임을 명시. JSDoc에 `@example` 추가 권장.

**`DeprecatedModelInfo.reason` 타입 narrowing** (기존 `string` → string-literal union, **breaking**):
현재 `src/config/deprecated.ts:15`의 `reason: string`을 다음으로 narrow한다:
```ts
export type DeprecationReason = 'replaced_by_newer' | 'removed_from_api' | 'tier_change';
export interface DeprecatedModelInfo {
  shutdownDate: string;
  replacement: GeminiModel;
  reason: DeprecationReason;  // CHANGED: was `string`
  // 기존 필드 그대로
}
```
- **기존 5개 `DEPRECATED_MODELS` 항목 마이그레이션 필수**: 모두 현재 prose string (e.g. `"Gemini 2.0 series end of life"`)을 사용 중. 각 항목의 `reason`을 `'replaced_by_newer'`로 일괄 치환. 원본 prose는 `notes: string` 신규 필드(optional)로 이전.
- `DeprecationReason` 타입을 `src/index.ts`에서 export.

**`AttemptRecord` 확장** (`src/types/errors.ts`):
현재 `AttemptRecord`에는 `reason` 필드가 없으므로, Phase 6 테스트가 컴파일되려면 다음 추가가 필요하다:
```ts
export interface AttemptRecord {
  model: GeminiModel;
  error: string;
  timestamp: Date;
  statusCode?: number;
  reason?: DeprecationReason;  // NEW — set when fallback skipped the call entirely
}
```

**`reason` 필드 동작**:
- `removed_from_api`: 즉시 fallback (위 절차). Phase 5의 paid-only warn은 **적용하지 않음** (Phase 1.5의 error가 우선).
- `replaced_by_newer`: 기존 v0.6.0 deprecation 경고 (호출 자체는 가능)
- `tier_change`: free-tier에서 빠진 paid-only 전환 (§Phase 5)

**`fetch-models`가 자동 감지하도록 (선택)**:
- `scripts/fetch-models.ts`에 "이전 `models-data.json`에 있었으나 새 응답에 없는 모델" diff 로직 추가
- 감지 시 CI 실패가 아니라 *경고 로그* + `models-data.json`에 `_removed:` 섹션 기록 → 사람이 PR로 처리
- 완전 자동화는 [plan-auto-free-tier-update.md](./plan-auto-free-tier-update.md)에 위임

### Phase 2: 모델 메타데이터
> **선행조건**: Phase 1의 canonical ID 확정 결과를 §4의 임시 ID에 반영한 뒤에만 진행. Phase 1을 건너뛰면 잘못된 ID가 generate-models 출력에 굳어진다.
- [ ] §4 제안안의 임시 ID를 Phase 1 확정 ID로 교체
- [ ] `scripts/generate-models.ts`의 `targetFallbackOrder` 갱신 (교체된 §4 ID 기준)
- [ ] `npm run generate-models` → `src/types/models.ts`, `src/config/models.ts` 자동 갱신
- [ ] `src/config/models.ts`의 `MODEL_PRIORITY`에 신규 모델 priority 부여. **`MODEL_PRIORITY`는 lower number = higher priority** (현재 값: `gemini-3-flash-preview: 0`, `gemini-2.5-flash: 1`, `gemini-2.5-flash-lite: 2`, `gemini-2.5-pro: 105`, `gemini-2.0-flash: 200`, `gemini-2.0-flash-lite: 210`, `gemini-3.1-pro-preview: 1005`, `gemini-3.1-flash-lite-preview: 1010`). `gemini-3.5-flash`를 최상위로 두려면 **기존 8개 entry 전체를 +1씩 shift한 뒤 `gemini-3.5-flash: 0` 추가**. 부분 shift는 priority 값 중복을 유발하므로 금지.

### Phase 3: 모델별 Rate Limit 기본값
- [ ] `src/monitoring/rate-limit-tracker.ts`: `RateLimitConfig`에 `tpm?: number` 필드 추가
- [ ] `defaultLimits` 초기화를 일괄 `{rpm:15, rpd:1500}` → 모델별 테이블로 변경. 신규 상수를 `src/config/free-tier-limits.ts`로 분리해 관리:
  ```ts
  export const FREE_TIER_LIMITS: Partial<Record<GeminiModel, RateLimitConfig>> = {
    'gemini-2.5-flash':              { rpm: 5,  tpm: 250_000, rpd: 20 },
    'gemini-2.5-flash-lite':         { rpm: 10, tpm: 250_000, rpd: 20 },
    'gemini-3-flash-preview':        { rpm: 5,  tpm: 250_000, rpd: 20 },
    'gemini-3.1-flash-lite':         { rpm: 15, tpm: 250_000, rpd: 500 },  // stable (Phase 1 확정)
    'gemini-3.5-flash':              { rpm: 5,  tpm: 250_000, rpd: 20 },
    // 'gemini-3.1-flash-lite-preview'는 stable로 대체 — DEPRECATED_MODELS에서 replaced_by_newer 처리
    // 이외 모델은 paid-tier 추정 — fallback default 유지
  };
  ```
- [ ] Free-tier 미제공 모델에 대해서는 별도 상수 `NON_FREE_TIER_MODELS`로 표시
- [ ] `FREE_TIER_LIMITS`에 항목이 없는 모델은 paid-tier로 간주하여 **기존 default `{rpm:15, rpd:1500}` 그대로 유지** (paid quota는 §3 비목표). `tpm`은 paid-tier에서 `undefined`로 두어 TPM 예측 미수행.

### Phase 4: TPM 추적
- [ ] `RateLimitTracker` 내부 history를 `{ time: Date, tokens?: number }`로 확장
- [ ] `recordTokens(model: GeminiModel, tokens: number, apiKeyIndex?: number)` 신규 method — 내부 history record에 토큰 카운트를 추가. `recordRequest`의 signature는 변경하지 않음 (현재 시그니처와 모든 call site 호환 유지).
- [ ] **`src/client/FallbackClient.ts`의 4개 `recordRequest(model)` 호출 사이트** (FallbackClient.ts:167, 306, 438, 571)는 응답 수신 **이전**에 실행되므로 `tokensUsed`를 알 수 없음. **2-step 패턴 필수**:
  - 기존 위치에서는 `recordRequest(model)`만 호출 (요청 카운트만 기록)
  - SDK 응답이 resolve된 직후 (각 메서드의 retryWithBackoff 반환 직후) **새로운 `recordTokens(model, response.usageMetadata?.totalTokenCount ?? 0)` 메서드 호출 추가**
  - `recordRequest`에 `tokensUsed` positional argument를 추가하지 **않는다** — call site에서 호출 시점상 토큰을 모름. `recordTokens`는 별도 method.
- [ ] `RateLimitStatus`에 `currentTPM`, `maxTPM`, `tpmUtilizationPercent` 추가 (additive — 구조적 타입에 안전하지만 README/MONITORING.md에 변경 명시)
- [ ] `willExceedSoon`을 RPM·TPM·RPD 셋 중 가장 가까운 한계 기준으로 계산
- [ ] 예측 임계값 (80%/90%)을 TPM에도 동일 적용. **TPM 가드 패턴 (필수)**: `getStatus()`와 `willExceedSoon` 계산에서 TPM 분기는 반드시 `if (config.tpm !== undefined) { ... TPM 검사 ... }`로 감싼다. `tpm`이 `undefined`인 paid-tier 모델에서는 `currentTPM`/`maxTPM`/`tpmUtilizationPercent` 필드를 `undefined`로 둔다 (NaN/Infinity 방지). 이 가드 누락은 §8 Rollback 케이스를 트리거한다.

### Phase 5: Free-tier 경고 (paid-only 모델용)
- [ ] `src/config/deprecated.ts`와 별개로, free-tier 미제공이지만 API에는 존재하는 모델 호출 시 첫 호출에서만 1회 `logger.warn` 출력
- [ ] 메시지 예: `[GemBack] Model "gemini-2.5-pro" is not on the free tier as of 2026-05-28; expect 4xx on free-tier API keys.`
- [ ] **mechanism**: `FallbackClient`에 이미 존재하는 instance 필드 `warnedDeprecatedModels: Set<string>` (FallbackClient.ts:38)을 그대로 활용하거나 `warnedNonFreeTierModels: Set<string>`을 신규 추가. 경고는 **`GemBack` instance당 1회** (per-process가 아님) — 인스턴스 재생성 시 다시 경고.
- [ ] **trigger 우선순위 (단일 authoritative 신호)**: Phase 5의 warn은 **`NON_FREE_TIER_MODELS.includes(model)`이 true인 경우에만** fire. `DEPRECATED_MODELS[model]?.reason`은 **이 결정에 사용하지 않음** (deprecation 시스템과 free-tier 분류는 직교).
- [ ] **사라진 모델 가드**: 위 trigger 직전에 `if ((REMOVED_MODELS as readonly string[]).includes(model)) return;` 가드를 두어, removed_from_api 모델이 우연히 `NON_FREE_TIER_MODELS`에도 포함된 경우 Phase 1.5의 error 경로만 fire하도록 한다. `REMOVED_MODELS`는 `readonly string[]`로 선언 (Phase 1.5 step 5 참조) — 제거된 모델 ID는 `GeminiModel` union에 없으므로 `model: GeminiModel`을 직접 비교하기 위한 widening cast가 필요.

### Phase 6: 테스트
> 모든 테스트 작성·실행은 Phase 1에서 canonical 모델 ID가 확정된 이후에 진행한다. 본 phase의 ID는 임시 표기.
- [ ] `tests/unit/rate-limit-tracker.test.ts`에 모델별 한도 케이스 추가 (Phase 1 확정 후, 3.1 Flash Lite는 RPD 500, 나머지는 RPD 20)
- [ ] TPM 추적 케이스: 250K 한도, 80%/90% 예측 — `usageMetadata.totalTokenCount`를 모킹해 200K(80%)·225K(90%) 누적 시 `willExceedSoon` true 검증. **실제 250K 토큰 생성하지 않음** (CI 비용·시간).
- [ ] `tests/integration/free-tier-fallback.test.ts` 신규: RPD 20인 모델 두 개를 빠르게 소진 후 3.1 Flash Lite (canonical ID는 Phase 1 결과)로 fallback되는지 검증
- [ ] `tests/unit/removed-model.test.ts` 신규: 사라진 모델을 `fallbackOrder`에 (string 캐스팅으로) 명시한 경우 SDK 호출 시도 없이 즉시 다음 모델로 넘어가는지 검증. `GeminiBackError.allAttempts`에 `reason: 'removed_from_api'` 기록 검증.
- [ ] **paid-tier customLimits regression test**: 사용자가 `{ 'gemini-2.5-pro': { rpm: 50 } }` 같은 partial override를 전달했을 때 본인이 지정하지 않은 다른 paid-tier 모델은 여전히 `{rpm:15, rpd:1500}` default를 유지하는지 검증. `FREE_TIER_LIMITS` 도입이 paid 사용자에게 silent breakage를 일으키지 않도록 보장.
- [ ] `npm run typecheck`, `npm test`, `npm run lint` 통과 확인

### Phase 7: 문서 및 릴리스 메타데이터
- [ ] `package.json` version `0.6.0` → `0.7.0` 변경 (npm publish는 이 값 그대로 publish하므로 누락 시 잘못된 버전이 배포됨)
- [ ] 마이그레이션 안내는 **README.md 내 "Migrating from v0.6 to v0.7" 섹션으로 통합한다** (결정 완료 — README는 이미 `package.json` `files`에 포함되므로 npm 사용자에게 자동 전달됨). 별도 `MIGRATION.md` 파일은 작성하지 않으며 `files` 배열도 수정하지 않는다.
- [ ] `README.md` / `README.ko.md`의 supported models 섹션 갱신, free-tier 표 첨부
- [ ] `README.md` 신규 섹션 "Migrating from v0.6 to v0.7": 제거된 모델 ID와 replacement 매핑, `DEPRECATED_MODELS`·`REMOVED_MODELS` export 사용 예
- [ ] `CHANGELOG.md`에 v0.7.0 항목 추가 — `### BREAKING CHANGES` 섹션으로 명시 (DeprecatedModelInfo.reason 타입 narrowing은 확정; GeminiModel 리터럴 제거·ALL_MODELS 축소는 Phase 1 결과에 따라 조건부)
- [ ] `MONITORING.md`에 TPM 섹션 추가
- [ ] `docs/DEV_LOG.md` 상단에 Phase별 결정 기록
- [ ] `docs/DEV_PROGRESS.md` 신규 v0.7.0 섹션 생성
- [ ] `git tag v0.7.0 && git push origin master --tags` — CLAUDE.md의 release process 단계에 따라 tag 후 push (npm publish 전후 어느 쪽이든 일관성 유지, 보통 publish 직후)

> **유지보수자 코드 마이그레이션**: 기존 5개 `DEPRECATED_MODELS` 항목 prose→union 변환은 Phase 1.5 §`DeprecatedModelInfo.reason` 타입 narrowing 절에서 수행한다 (단일 source of truth). 본 Phase 7은 그 결과를 README MIGRATION 섹션에 노출하는 역할.

## 6. 검증

릴리스 차단 조건:
- [ ] `package.json` version이 `0.7.0`인지 확인
- [ ] `npm run prepublishOnly` 통과
- [ ] 모든 free-tier 모델에 대해 RPM/TPM/RPD가 §5 Phase 3 `FREE_TIER_LIMITS` 정의와 일치하는 단위 테스트
- [ ] `gemback-0.7.0.tgz` 로컬 install 후 다음 `examples/` 스니펫 실행 검증 — Phase 1 ID 확정 후 적용 가능한 것만 선별:
  - `basic-usage.ts` (mocked or live)
  - `monitoring-example.ts` (TPM 필드 확인)
  - `custom-fallback.ts` (사용자가 명시적 fallbackOrder 전달 시 동작)
  - 그 외 examples/는 manual smoke로 충분
- [ ] **Backward-compat smoke** — repo 루트에 커밋되어 있는 `gemback-0.6.0.tgz`와 새로 build/pack한 v0.7.0 산출물을 사용:
  ```bash
  # 0) v0.7.0 타르볼을 먼저 생성 (아직 repo 루트에는 없음):
  cd /Users/laeyoung/Documents/personal/gem-back
  npm run build && npm pack
  # → gemback-0.7.0.tgz 파일이 repo 루트에 생성됨. 정확한 파일명은 package.json의 version 필드를 따름.

  # 1) 임시 작업 디렉토리에서 backward-compat 비교:
  mkdir -p /tmp/gemback-bc && cd /tmp/gemback-bc
  npm init -y
  npm install -D tsx                                                  # gemback 타르볼은 tsx를 안 가져옴; 명시적 설치 필요
  npm install /Users/laeyoung/Documents/personal/gem-back/gemback-0.6.0.tgz
  cp /Users/laeyoung/Documents/personal/gem-back/examples/basic-usage.ts ./
  npx tsx basic-usage.ts  # v0.6.0 surface, 정상 동작 확인
  # 그 다음 v0.7.0으로 업그레이드:
  npm install /Users/laeyoung/Documents/personal/gem-back/gemback-0.7.0.tgz
  npx tsx basic-usage.ts  # 동작 결과 기록 (호환 시 그대로 통과; 회귀 발생 시 원인과 스택 트레이스 기록)
  ```
  결과를 README "Migrating from v0.6 to v0.7" 섹션에 그대로 반영. v0.7.0의 breaking 표면 (reason 타입, 제거된 모델 리터럴)을 basic-usage.ts가 사용하지 않으면 호환 가능하며, 사용 시 break.
- [ ] **TPM 경고 통합 테스트**: SDK 응답을 모킹해 `usageMetadata.totalTokenCount`를 200K → 225K로 누적시켜 `willExceedSoon` 및 80%/90% 경고 발생 검증. **실제 free-tier API key로 250K 토큰 생성하는 live 테스트는 release checklist에 manual 단계로 분리** (CI 자동 실행 X).

## 7. 리스크 및 결정 이력

| 항목 | 옵션 | 결정 | 사유 |
|---|---|---|---|
| 3.5 Flash 모델 ID | API에서 확정 | Phase 1로 분리 | 사용자 표기와 API ID가 다를 가능성 (`-preview` 등) |
| TPM 추적 구현 위치 | RateLimitTracker / HealthMonitor | RateLimitTracker | 한도 예측은 rate-limit의 책임이며 응답시간은 health의 책임 |
| Non-free-tier 모델 처리 | 제거 / 경고 / 유지 | 경고 + 유지 | paid-tier 사용자 호환성. 제거하면 breaking change |
| 사라진 모델 처리 | grace period / 즉시 제거 | 1버전 deprecation → 다음 메이저 삭제 | API에서 사라진 모델은 호출해도 404이므로 fallback 시도 가치 없음. `DEPRECATED_MODELS`에 기록만 남기고 `ALL_MODELS`에서 빼는 것이 사용자 혼동 최소화 |
| 사라진 모델 자동 감지 | fetch-models 통합 / 수동 | fetch-models가 경고만, PR은 수동 | 모델 라인업 변경은 의도된 메이저 결정이라 사람 리뷰가 필요 |
| DEFAULT_FALLBACK_ORDER | 품질 우선 vs RPD 우선 | RPD 우선 | free-tier 사용자의 실제 통증은 quota 소진 |
| 자동 파싱 통합 | 본 plan에 포함 | 분리 (plan-auto-free-tier-update) | 본 plan은 스냅샷 1회, 자동화는 별도 lifecycle |
| Semver 0.7.0 vs 1.0.0 | breaking이지만 0.7.0 | 유지 | npm 생태계 관행: 0.x에서 minor bump가 breaking 허용 (예: TypeScript handbook, semver.org §4). 이 프로젝트는 v0.6.0 → v0.7.0까지 minor에서 라인업 변경을 해왔고 CHANGELOG로 surface change를 추적. 본 plan은 그 관행을 따른다. v1.0.0 도달 후엔 strict semver. |
| `DeprecatedModelInfo.reason` 타입 변경 | 새 필드 추가 vs 기존 narrow | 기존 narrow + 5개 entry 마이그레이션 | 기존 필드 형식이 prose string으로 일관되지 않아 narrow가 typing 이득 큼 |
| TPM 추적 API 형태 | `recordRequest`에 `tokensUsed?` 추가 vs 별도 `recordTokens` 메서드 | 별도 `recordTokens` | `recordRequest`는 SDK 호출 **이전**에 실행되어 토큰 수 미정. 응답 후 `recordTokens`를 별도 호출하는 2-step 패턴이 call-site 시그니처 호환과 정확성 모두 충족 |

## 8. Rollback 계획

v0.7.0 출시 후 다음 시나리오에 대비한다:

| 시나리오 | 대응 |
|---|---|
| Phase 1.5에서 제거한 모델이 실제로는 API에 남아있는 것이 사후 확인됨 | v0.7.1 patch — `GeminiModel` union과 `ALL_MODELS`에 해당 리터럴 재추가, `FREE_TIER_LIMITS`와 `DEPRECATED_MODELS` 엔트리는 그대로 (사용자가 명시적으로 호출 시 정상 동작 복구). 기타 변경 사항 (TPM, 모델별 한도)은 유지. |
| 신규 `gemini-3.5-flash` ID가 잘못 채택됨 | v0.7.1 patch — `targetFallbackOrder`와 `MODEL_INFO`만 수정, `npm run update-models` 재실행. |
| `DeprecatedModelInfo.reason` 타입 narrowing이 다운스트림 빌드를 깸 | v0.7.1 patch — `reason` 타입을 v0.6.0 동일한 `string`으로 **완전 revert** 후 v0.8.0에서 재시도. `DeprecationReason \| string` union은 TS가 즉시 `string`으로 widen해 타입 안전성을 잃으므로 채택하지 않는다. v0.8.0에서는 README에 사전 공지하고 `DEPRECATED_MODELS` entry들의 reason 값을 먼저 union 호환으로 정리한 뒤 narrow. |
| TPM 추적 로직 버그로 paid-tier 사용자에게 잘못된 경고 | v0.7.1 patch — `tpm === undefined`일 때 TPM 체크 완전 skip하는 가드 추가. |

**Rollback 원칙**: `DEPRECATED_MODELS`와 `REMOVED_MODELS` export는 "무엇이 제거되었는가"의 single source of truth. patch release에서 entries를 추가/제거할 때 이 두 상수만 참조하면 일관성 유지.

**Rollback 커뮤니케이션 프로세스**:
1. patch tarball 빌드 → `npm publish` (default dist-tag `latest`).
2. GitHub Release notes에 affected version 명시, breakage 재현 단계 포함.
3. GitHub Issue로 pinned advisory 발행 — affected version (v0.7.0) 사용자에게 `npm install gemback@0.7.1` 안내.
4. v0.6.x 라인이 여전히 안정적이라면 구체적인 patch 버전을 골라 `npm dist-tag add gemback@0.6.0 legacy` (또는 최신 0.6.x patch) 형태로 dist-tag 등록. **`0.6.x` 범위 표기는 `npm dist-tag`가 거부하므로 사용 금지** — 항상 concrete version 지정.
5. README의 "Migrating from v0.6 to v0.7" 섹션 상단에 rollback 경고 footnote 추가.

---

## Appendix A: Free-tier 미제공 (API 존재, paid-only) 모델

| Model ID | 현재 상태 | v0.7 처리 |
|---|---|---|
| `gemini-2.5-pro` | ALL_MODELS 포함 | 유지 + free-tier 경고 |
| `gemini-2.0-flash` | ALL_MODELS 포함 | 유지 + free-tier 경고, 다음 분기에 deprecated 검토 |
| `gemini-2.0-flash-lite` | ALL_MODELS 포함 | 동일 |
| `gemini-3.1-pro-preview` | ALL_MODELS 포함 | 동일 |

## Appendix B: 사라진 모델 (Phase 1.5 대상)

Phase 1 (`npm run fetch-models`) 실행 후 채워짐. 본 plan 작성 시점(2026-05-28) 사용자 스냅샷에서는 **현재 `ALL_MODELS`의 어느 모델도 API에서 명시적으로 사라진 것으로 확인되지 않았다** — Phase 1.5는 향후 fetch-models 결과에 따라 활성화될 정책적 골격이다.

| 후보 Model ID | 현 상태 (2026-05-28 사용자 표 기준) | Phase 1 후 적용 |
|---|---|---|
| `gemini-3.1-flash-lite-preview` | 표에 active free-tier (15/250K/500) | 유지 (Phase 1.5 적용 안 함) |
| `gemini-3.1-pro-preview` | 표에 0/0/0 = paid-only | Appendix A 분류 유지 (`reason: 'tier_change'`로 deprecation 추가 검토) |
| `gemini-2.0-flash`, `gemini-2.0-flash-lite` | 표에 0/0/0 = paid-only | 동일 |
| (Phase 1에서 API 응답 누락 발견) | — | Phase 1.5 removal pipeline 적용 |

> 본 표는 Phase 1 실행 결과에 따라 갱신된다. fetch-models가 어떤 모델이든 더 이상 반환하지 않으면 해당 모델을 Phase 1.5의 removal pipeline으로 이관한다.
