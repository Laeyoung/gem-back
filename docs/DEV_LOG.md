# 개발 로그 (Development Log)

> 최신 항목이 가장 위에 위치합니다.
> 관련 문서: [v0.7 계획서](./plan-free-tier-models-2026-05.md) | [v0.6 계획서](./plan-update-gemini-models-2026-03.md) | [진행 현황](./DEV_PROGRESS.md)

---

## 2026-11-11 ~17:40 — v0.8.0 보강: 무료 티어 한도 번들, 기본 체인 3순위 `gemini-3.8-flash`, Node >= 20 (issue #36)

### 배경
2026-11-10 동기화 때는 무료 티어 수치를 읽을 수 없어 신규 모델에 한도를 넣지 않았고, `gemini-3.8-flash`는 프로브가 503만 받아 무료 티어 접근이 미확인이었음. 2026-11-11 메인테이너가 Google AI Studio 대시보드(Usage & Billing → Rate Limit, "All models" 보기)에서 수치를 직접 읽음. 계정의 모든 프로젝트가 Free tier, 확인 프로젝트는 "Gemini Project 2". 대시보드 "used / limit" 칸의 limit 값을 사용.

### 1. `FREE_TIER_LIMITS`
| 모델 | RPM | TPM | RPD |
|---|---|---|---|
| `gemini-3.5-flash-lite` | 15 | 250K | 500 |
| `gemini-3.1-flash-lite` | 15 | 250K | 500 |
| `gemini-3.6-flash` | 5 | 250K | 20 |
| `gemini-3.8-flash` | 5 | 250K | 20 |
| `gemini-3-flash-preview` | 5 | 250K | 20 |
| `gemini-2.5-flash` | 5 | 250K | 20 |
| `gemini-2.5-flash-lite` | 10 | 250K | 20 |
| `gemini-2.5-pro`, `gemini-3.1-pro-preview`, `gemini-4-argon` | 0 | 0 | 0 |

- 기존 5개 항목(2026-05-28 스냅샷)은 값이 그대로임을 확인. 신규 3개(3.5-flash-lite, 3.6-flash, 3.8-flash) 추가.
- `gemini-3.5-flash`, `gemini-3.7-flash`는 대시보드에 없음 — deprecations 표대로 요청이 각각 3.6-flash / 3.8-flash로 자동 라우팅되기 때문. 두 항목은 라우팅 대상 모델의 한도(5/250K/20)를 그대로 씀.
  - **검토한 대안**: 두 항목을 삭제해 트래커 기본값(15 RPM, TPM 미추적) 사용 → 실제로는 5 RPM 버킷에서 소비되는데 15 RPM으로 예측해 rate-limit 예측이 무의미해짐. 기각. 3.5-flash 항목은 이미 5/250K/20이었으므로 유지가 하위 호환에도 맞음.
- `NON_FREE_TIER_MODELS`는 변경 없음(대시보드 limit 0으로 재확인). 대시보드의 "Gemini 4 Carbon"(0/0/0)은 라이브러리에 없는 모델이라 무시.

### 2. `DEFAULT_FALLBACK_ORDER` → `gemini-3.5-flash-lite` → `gemini-3.6-flash` → `gemini-3.8-flash`
- 3.8-flash를 뺐던 유일한 이유는 무료 티어 접근 미확인이었음. 대시보드에서 5 RPM / 20 RPD로 확인됐고 종료일도 없어 deprecation 경고 없이 별도 쿼터 버킷 하나가 늘어남.
- **검토한 대안**
  - 2개 유지 → 3.8-flash의 하루 20회를 기본 설정에서 버림. 근거가 사라졌으므로 기각.
  - `gemini-3.1-flash-lite`(15 RPM / 500 RPD) 추가 → 쿼터는 가장 크지만 2027-05-07 종료 예정이라 기본 설정에서 매번 deprecation 경고. 기존 결정("경고 없는 현행 GA")과 충돌해 기각. README 예시에서 백업으로 계속 안내.
  - 3.8-flash를 3.6-flash 앞에 두기 → 두 모델 한도가 같아 순서로 얻는 이득이 없음. 직전 릴리스에서 검증된 순서를 앞에 그대로 두는 편이 변화가 작음.
- `scripts/generate-models.ts`의 `targetFallbackOrder`만 수정하고 `npm run generate-models`(커밋된 `scripts/models-data.json` 사용, API 미호출)로 재생성. 생성물 diff는 `DEFAULT_FALLBACK_ORDER`와 생성 시각뿐.

### 3. `engines.node` `>=18.0.0` → `>=20.0.0`
- `@google/genai`가 1.33.0부터 Node >= 20 요구(전날 기록한 불일치). gemback이 18을 약속해도 의존성이 받쳐주지 않음 → BREAKING CHANGES에 명시.
- `.github/workflows/test.yml`이 Node 18 단일 버전으로 돌고 있어 20으로 변경(matrix 아님). release / test-pr / showcase 워크플로는 이미 20.
- **검토한 대안**: 18 유지 + 문서 경고만 → 설치 시 엔진 불일치를 숨기는 셈이라 기각.

### API 호출
없음. `fetch-models` / `test:e2e` 미실행.

### 검증
- `npm run typecheck` / `lint` / `format:check` clean, `npm test` 374/374 (23 files), `npm run build` 성공.

---

## 2026-11-10 ~22:00 — v0.8.0: Gemini API 동기화 (issue #36)

### 배경
0.7.1의 모델 메타데이터는 2026-05-28 생성본. 2026-11-10 기준 `v1beta/models`(47개)와 공식 deprecations 표에서 벗어나 있었음: 2.0 계열 종료(2026-06-01), 신규 GA 모델(3.5-flash-lite / 3.6 / 3.7 / 3.8-flash / 4-argon), deprecation 날짜 변경. 다운스트림(knou-ibt)이 `gemini-3.5-flash → gemini-3.1-flash-lite → gemini-3-flash-preview` 체인을 쓰므로 이 세 ID는 깨지면 안 됨.

### 1. 생성 스크립트
- **문제**: `fetch-models`가 "최신 major의 preview만 허용" 규칙이라, API에 Gemini 4가 뜨자 `gemini-3-flash-preview` / `gemini-3.1-pro-preview` / `gemini-3.1-flash-lite-preview`가 union에서 빠질 상황. `EXCLUDED_VARIANT_PATTERN = /-tts-|-customtools$/`는 `-tts`로 끝나는 ID(`gemini-3.8-flash-tts`)와 비텍스트 계열(transcribe, nano-banana, omni)을 못 걸렀음. `calculatePriority`는 major 4를 "구버전(300)"으로 분류.
- **수정**: 선택 규칙을 순수 함수 모듈 `scripts/model-filters.ts`로 분리.
  - `isGeneralTextModel`: ID 형태 allow-list `^gemini-<major>[.<minor>]-` + variant deny 패턴(`-tts`, `-transcribe`, `-image`, `-computer-use`, `-customtools`).
  - `selectLibraryModels`: stable ∪ 최신 major의 preview ∪ **라이브러리가 이미 싣고 있는 preview**(현재 `src/types/models.ts`에서 읽음).
  - `fetch-models`가 "라이브러리엔 있는데 API에서 사라진 모델"을 경고로 출력 → `REMOVED_MODELS` 갱신 트리거.
- **검토한 대안**
  - preview 버전 조건을 아예 제거 → 구버전의 새 preview까지 무차별 유입. 기존 필터의 의도(신규 preview는 최신 major만)를 버리게 되어 기각.
  - 유지할 preview를 수동 목록으로 관리 → 목록이 계속 자라고 누락 시 조용히 union에서 빠짐. 기각.
  - 직전 `models-data.json`을 "기존 모델" 기준으로 사용 → `--all` 실행 한 번에 오염됨. 생성 결과물(`src/types/models.ts`)을 기준으로 삼는 편이 견고.
  - 비텍스트 계열을 `MANUAL_EXCLUDES`에 나열 → omni-1.1/1.2처럼 버전이 늘 때마다 수정 필요. ID 형태 allow-list가 더 단순.
- **결정 이유**: 규칙이 I/O 없는 순수 함수라 2026-11-10 API 스냅샷으로 단위 테스트 가능(`tests/unit/model-filters.test.ts`).

### 2. 제거 모델 (`gemini-2.0-flash`, `gemini-2.0-flash-lite`)
- `REMOVED_MODELS`에 등록, union/`ALL_MODELS`/`DEPRECATED_MODELS`/`NON_FREE_TIER_MODELS`에서 제거. 기존 skip 메커니즘(`reason: 'removed_from_api'`) 그대로 사용.
- 1회성 에러 로그에 공식 대체 모델을 표기하도록 `REMOVED_MODEL_REPLACEMENTS` 추가 (index 미노출).
- **부수 발견(수정)**: `ALL_MODELS` 밖의 ID(제거된 ID를 `RateLimitTracker`에 직접 넘기거나, 라이브러리보다 새로운 ID를 `as any`로 넘긴 경우)에서 `getStatus()`가 `TypeError`(config undefined) — `enableMonitoring: true`면 모델 시도 전에 요청이 죽음. 보수적 기본값으로 폴백. `modelUsage[model]++`가 `NaN`이 되는 것도 함께 수정. 메타데이터가 API보다 늦는 상황(이번 이슈의 본질)에서 크래시를 막는 방어.
- **검토한 대안**: 제거된 ID를 대체 모델로 자동 치환 → 호출자가 모르는 모델로 과금/품질이 바뀜. 문서화된 skip 동작 유지.

### 3. `DEPRECATED_MODELS`
- 공식 표 반영: 2.5-flash/2.5-pro → 2026-12-01(리라우팅), 2.5-flash-lite 항목 삭제(종료일 미발표), 3.1-flash-lite 2027-05-07 추가, 3.1-flash-lite-preview 2026-05-25.
- 종료일 없이 대체된 모델(3-flash-preview, 자동 라우팅되는 3.5-flash / 3.7-flash)을 표현하기 위해 **`shutdownDate`를 optional로 변경**. 경고 문구는 날짜가 없으면 `has been superseded (no shutdown date announced)`.
- **검토한 대안**: 날짜를 임의로 채우기(기각 — 표에 없는 날짜를 만들지 않음) / `reason`에 `'superseded'` 추가(기각 — 기존 union `replaced_by_newer`로 충분, 타입 변경 최소화) / 해당 모델을 목록에서 제외(기각 — 사용자가 대체 모델 안내를 못 받음).
- `gemini-3.1-pro-preview`는 표에 대체 모델이 없어(`replacement` 필수) 등록하지 않음.

### 4. `DEFAULT_FALLBACK_ORDER`
- 무료 티어 쿼터 수치는 더 이상 문서에 공개되지 않음(AI Studio 대시보드 전용) → RPD 순위를 매길 수 없어 **접근 가능 여부 프로브**로 결정. 무료 티어 키로 모델당 최소 `generateContent` 1회:

  | 모델 | 결과 |
  |---|---|
  | `gemini-3.5-flash-lite` | 200 OK |
  | `gemini-3.6-flash` | 200 OK |
  | `gemini-3.8-flash` | 503 UNAVAILABLE ("currently experiencing high demand") — 3회 시도 모두 |
  | `gemini-4-argon` | 429 RESOURCE_EXHAUSTED — `generate_content_free_tier_requests` / `..._input_token_count` 4개 metric 모두 `limit: 0` |

- 결정: `gemini-3.5-flash-lite` → `gemini-3.6-flash` (lite 우선). 3.8-flash는 응답을 받지 못해 제외(유료 전용으로 단정할 근거도 없어 `NON_FREE_TIER_MODELS`에는 넣지 않음). 4-argon은 `NON_FREE_TIER_MODELS`.
- **검토한 대안**: `gemini-3.1-flash-lite`(2026-05 기준 500 RPD)를 꼬리에 유지 → 종료일(2027-05-07)이 있는 모델이라 기본 체인에서 매번 deprecation 경고가 발생. 기본값은 "경고 없는 현행 GA"로 두고 README 예시에서 백업으로 안내.
- 기본 체인이 3 → 2 모델로 줄었음. 3.8-flash 접근이 확인되면 3순위로 추가 검토.

### 5. `FREE_TIER_LIMITS`
- 수치를 지어내지 않음. 4-argon의 429 본문은 `limit: 0`만 알려주므로 항목 추가 없음. 신규 모델은 트래커 기본값(15 RPM, TPM 미추적). 기존 5개 항목은 2026-05-28 스냅샷이며 재검증하지 못했음을 주석에 명시.
- **메인테이너 확인 필요**: `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`의 RPM/TPM/RPD (AI Studio 대시보드), 그리고 자동 라우팅되는 `gemini-3.5-flash`의 기존 수치(5/250K/20)가 여전히 유효한지.

### 6. "All models failed" 메시지
- 접두사는 그대로(`All models failed` / `All models failed for streaming` — 다운스트림이 정규식 매칭), 뒤에 시도 기록 요약을 덧붙임: `[model: 429 RESOURCE_EXHAUSTED; model: 503 UNAVAILABLE]`.
- `src/utils/attempt-summary.ts`: 구조화 에러는 `<code> <STATUS>`, 비구조화는 공백 정리 후 80자, 전체 600자 상한(`+N more`), `key=…`/`AIza…` 마스킹(잘라내기 **전에** 마스킹해 경계에서 키 조각이 남지 않게 함). `allAttempts`는 불변.
- 4개 throw 지점(generate / generateStream / generateContent / generateContentStream; chat은 generate 위임) 모두 적용.

### 7. `@google/genai` ^1.33.0 → ^2.32.0
- 2.0.0 breaking change는 Interactions 전용. 2.32.0 설치 후 typecheck / 전체 테스트 통과, 빌드된 `dist/`로 JSON 모드 `generateContent` 실호출 1회 성공(`gemini-3.5-flash-lite`, `{"ok": true}`).
- **3.x는 보류**: 3.0.0은 Node >= 22 요구 + Gemini Developer API 기본 버전이 v1beta → v1로 변경. 별도 평가 필요.
- **발견**: `@google/genai`는 1.33.0부터 이미 `engines.node >= 20`. gemback `package.json`의 `engines.node >= 18`은 0.7.x부터 의존성과 불일치(이번 변경으로 생긴 것 아님). gemback engines 상향은 별도 결정 사항으로 남김.

### 실 API 호출 수
generateContent 총 7회(프로브 6: 3.5-flash-lite 1, 3.6-flash 1, 3.8-flash 3, 4-argon 1 / SDK 스모크 1). 그 외 zsh의 `$m:g…` 수식어 확장으로 URL이 깨진 요청 4건이 404(모델 미도달)로 끝남 — 이후 `${m}`로 수정.

### 검증
- `npm run typecheck` / `lint` / `format:check` clean, `npm test` 371/371 (23 files), `npm run build` 성공.

---

## 2026-06-03 ~00:20 — fix: 구조화된 429(RESOURCE_EXHAUSTED) quota 오류 fallback 누락

### 배경 (다운스트림 버그 리포트)
GemBack 사용 프로젝트에서 `gemini-3.5-flash`의 free-tier RPD(20) 소진 후 **`fallbackOrder`가 설정되어 있음에도 `gemini-3.1-flash-lite`로 fallback하지 않고 3.5-flash만 재시도하다 실패**하는 현상 보고.

### 근본 원인 (systematic-debugging Phase 1~3)
실제 `@google/genai` ApiError 메시지를 실 API 키로 재현하여 확인:
- 비스트리밍 경로의 `error.message`는 `JSON.stringify({error:{code:429, message, status:"RESOURCE_EXHAUSTED"}})` 형태.
- `normalizeErrorMessage`가 내부 `error.message`(산문)만 추출하고 **권위 있는 `code`(429)·`status`("RESOURCE_EXHAUSTED")를 버림**.
- Gemini가 메시지에 "* Quota exceeded for metric…" 상세 줄을 붙이지 않는 **base 형태**에서는 `isRateLimitError`의 부분 문자열("429"/"rate limit"/"quota exceeded"/"too many requests")이 **하나도 매칭되지 않음** → 429인데도 rate-limit으로 분류 실패.
- 이때 `isRetryableError`의 `message.includes('5')`가 retry-delay 초("…5s") 등 임의의 숫자 5에 매칭 → **소진된 모델을 재시도**(설계상 429는 retry 없이 즉시 fallback이어야 함).
- 추가로 구조화된 503(UNAVAILABLE)도 산문에 "5"가 없으면 retryable로 인식되지 않는 역(逆) 결함 발견.

### 수정 (`src/utils/error-handler.ts`)
- `parseErrorBody()` 신설: 비스트리밍/스트리밍("got status: …. {json}") 양쪽 형태에서 `{code, message, status}` 구조 추출.
- `getErrorStatusCode()`: ① SDK `ApiError.status`(숫자) → ② JSON `error.code` → ③ 메시지 정규식 순으로 권위 신호 우선.
- `getErrorStatusName()` 신설: `RESOURCE_EXHAUSTED`/`UNAVAILABLE`/`PERMISSION_DENIED` 등 RPC status 이름 해석.
- `isRateLimitError`: statusCode 429 또는 status `RESOURCE_EXHAUSTED` 우선 판정 후 산문 매칭(`quota` 단독 추가).
- `isAuthError`: 401/403 또는 `UNAUTHENTICATED`/`PERMISSION_DENIED` 우선.
- `isRetryableError`: **`includes('5')` 제거** → `code>=500 && <600` 정밀 판정 + `UNAVAILABLE`/`INTERNAL`/`DEADLINE_EXCEEDED` + 네트워크/타임아웃 토큰.

### 검토한 대안
- "메시지 부분 문자열에 'resource_exhausted' 추가"만 하기 → 근본(코드 무시) 미해결·여전히 산문 의존이라 기각.
- 다운스트림에서 `fallbackOrder` 재설정 권고 → 라이브러리 결함이므로 부적합.

### 검증
- 실 API 키로 재현 스크립트: base-form 429 주입 시 1순위 모델 호출 **정확히 1회**(재시도 0) 후 `gemini-3.1-flash-lite` 성공 fallback 확인(PASS).
- 회귀 테스트 추가: `error-handler.test.ts`(구조화 429/503/streaming/stray-5 6건), `fallback.test.ts`(구조화 429 즉시 fallback 1건).
- 전체 292 tests pass · typecheck clean · lint clean.

---

## 2026-05-29 — v0.7.0 Free Tier 지원 업데이트 (Phase 1~7)

### 배경
2026-05-28 AI Studio dashboard free-tier 스냅샷 기반. 8회 multi-agent document review 거친 plan을 실행.

### Phase 1 — fetch-models 실행 결과 (블로킹 게이트)
- `gemini-3.5-flash` API에 존재 → 릴리스 차단 없음
- API 응답 13개 모델 (이전 7개에서 확장). 사라진 모델 없음 — Phase 1.5 removal pipeline 비활성.
- 신규 발견:
  - **`gemini-3.1-flash-lite`** (stable, preview suffix 없음) — DEFAULT_FALLBACK_ORDER에 채택
  - **`gemini-3-pro-preview`** — v0.6.0 deprecation 유지 (재포함하지 않음)
  - `gemini-3.1-flash-tts-preview`, `gemini-3.1-pro-preview-customtools` — 특수 variant, ALL_MODELS에서 제외
- 결정 이유: free-tier 사용자에게 stable 3.1-flash-lite의 500 RPD가 dominant daily quota이므로 DEFAULT 1순위로 두는 것이 quota 소진 지연에 최적.

### Phase 2 — 모델 메타데이터
- `scripts/generate-models.ts`에 `EXCLUDED_VARIANT_PATTERN` (`/-tts-|-customtools$/`) 및 `MANUAL_EXCLUDES` (gemini-3-pro-preview) 필터 추가.
- `targetFallbackOrder`를 `[3.1-flash-lite, 3.5-flash, 3-flash-preview]`로 변경.
- `npm run update-models` 실행 → ALL_MODELS 8 → 10 (3.5-flash, 3.1-flash-lite 추가).

### Phase 1.5 — DeprecatedModelInfo + AttemptRecord
- `reason: string` → `DeprecationReason = 'replaced_by_newer' | 'removed_from_api' | 'tier_change'` narrowing.
- 기존 5개 entry 마이그레이션: prose → `'replaced_by_newer'`, prose는 신규 optional `notes` 필드로 이전.
- 신규 entry: `gemini-3.1-flash-lite-preview` → `gemini-3.1-flash-lite` (replaced_by_newer).
- `AttemptRecord.reason?: DeprecationReason` 추가 (skip된 호출 기록용, removed_from_api 시나리오 대비).
- `DeprecationReason` 타입 src/index.ts에서 export.

### Phase 3 — 모델별 Rate Limit
- `src/config/free-tier-limits.ts` 신규 — `FREE_TIER_LIMITS` (5개 모델별 RPM/TPM/RPD), `NON_FREE_TIER_MODELS` (4개 paid-only).
- `RateLimitTracker` constructor가 ALL_MODELS 순회하며 FREE_TIER_LIMITS 우선, 없으면 `{rpm:15, rpd:1500}` paid 기본값.
- 검토한 대안: paid-tier에도 enterprise quota 적용 / FREE_TIER_LIMITS만 사용 → 기존 `{rpm:15, rpd:1500}` 유지하여 paid 사용자의 customLimits 호환성 보존.

### Phase 4 — TPM 추적
- `RateLimitConfig.tpm?: number` 추가.
- `tokenHistory: Map<string, TokenRecord[]>` 분리 트래킹 (request history와 별도).
- `recordTokens(model, tokens, apiKeyIndex?)` 신규 메서드 — `recordRequest`와 별개로 응답 후 호출.
- 검토한 대안: `recordRequest`에 `tokensUsed?` 추가 → 거부. `recordRequest`는 SDK 호출 **이전**에 실행되어 토큰 수 미정. 2-step 패턴이 call-site 호환성 보존.
- `RateLimitStatus`에 `currentTPM`, `maxTPM`, `tpmUtilizationPercent` 추가 — paid-tier 모델은 `undefined`.
- `willExceedSoon` = max(rpmUtilization, tpmUtilization) ≥ 90% (TPM은 config.tpm !== undefined 가드 적용).
- `FallbackClient.generate()` 및 `generateContent()`에 `recordTokens(model, response.usage.totalTokens)` 호출 추가. streaming은 chunk별 usage 부재로 미구현.

### Phase 5 — paid-only 모델 warn
- `warnedNonFreeTierModels: Set<string>` instance field 추가.
- `checkNonFreeTierModel(model)` — `NON_FREE_TIER_MODELS.includes(model)`일 때만 1회 logger.warn.
- 검토한 대안: DEPRECATED_MODELS.reason === 'tier_change'를 함께 신호로 사용 → 거부. deprecation 시스템과 free-tier 분류는 직교한다는 plan 결정 유지.

### Phase 6 — 테스트
- 신규 `tests/unit/free-tier-limits.test.ts`: 10개 테스트 (FREE_TIER_LIMITS 적용, TPM 추적, paid-tier 가드, customLimits regression).
- 기존 테스트 248개 유지 (sed로 default order 변경 반영): `gemini-3-flash-preview` ↔ `gemini-3.1-flash-lite` swap, `gemini-2.5-flash` → `gemini-3.5-flash`, 일부 paid-tier 의존 케이스는 `gemini-2.5-pro`로 모델 교체.
- 최종 258 tests passing, typecheck/lint clean.

### Phase 7 — 문서/릴리스
- package.json 0.6.0 → 0.7.0.
- CHANGELOG에 BREAKING CHANGES 섹션 + Added/Changed/Migration 분리.
- README의 supported models 갱신 (free-tier 표 첨부), "Migrating from v0.6 to v0.7" 섹션 신규.
- 본 DEV_LOG 작성.

### 후속 결정
- README.ko.md 한국어 갱신 — 후속 작업 (선택).
- MONITORING.md TPM 섹션 추가 — 후속 작업 (선택).
- examples/ 스니펫 갱신 — 후속 작업.
- `git tag v0.7.0 && git push origin master --tags` — 사용자 확인 후 실행.

---

## 2026-03-14 ~09:30 — 전체 구현 완료 (Phase 1~9)

### Phase: 전체 구현

**작업 내용**
- Phase 1-4: 코어 타입/설정 변경, deprecated.ts 생성, FallbackClient에 deprecation 경고 추가
- Phase 5: 중간 검증 — typecheck 통과, 테스트 4개 실패(예상대로), lint 통과
- Phase 6-7: 테스트 업데이트 및 신규 deprecated.test.ts 작성, 전체 242 테스트 통과
- Phase 8-9: 예제/문서 업데이트, package.json 0.6.0, CHANGELOG.md v0.6.0 릴리스 노트 추가, prepublishOnly 통과

**기술적 결정**
- `examples/custom-fallback.ts`에서 `gemini-2.0-flash` → `gemini-3-flash-preview`로 교체 (계획서의 의도와 동일)
- CHANGELOG.md 링크 섹션에서 기존 `[Unreleased]`가 `v0.4.0` 기준이던 오류도 함께 수정하여 `v0.5.0`, `v0.6.0` 링크 추가

**검증 결과**
- `npx tsc --noEmit`: 통과
- `npx eslint src/ --fix`: 통과
- `npx vitest run`: 18 파일, 242 테스트 통과 (기존 235 → 242, +7 신규 테스트)
- `npm run prepublishOnly`: build + test 모두 통과

---

## 2026-03-14 ~15:00 — 프로젝트 초기 설정

### Phase: 사전 준비

**작업 내용**
- `docs/DEV_PROGRESS.md` 생성: 계획서의 9 Step을 9개 Phase로 구조화하여 진행 현황 추적 파일 작성
- `docs/DEV_LOG.md` 생성: 개발 로그 파일 작성
- `CLAUDE.md` 업데이트: 진행 현황 추적 및 개발 로그 작성 지침 추가

**기술적 결정**
- 계획서의 Step 단위를 그대로 Phase로 매핑하되, 중간 검증(Step 5 → Phase 5, Step 7 테스트 검증 → Phase 7)은 별도 Phase로 분리
  - 이유: 검증 단계를 명시적으로 구분해야 이어 작업하는 개발자가 "코드는 작성했지만 검증은 안 됨" 상태를 쉽게 파악할 수 있음
- DEV_PROGRESS.md는 표 형식, DEV_LOG.md는 블로그 형식으로 역할 분리
  - DEV_PROGRESS.md: 현재 상태 한눈에 파악 (체크리스트)
  - DEV_LOG.md: 왜 그렇게 했는지, 무엇을 검토했는지 (의사결정 기록)

---

## 2026-03-13 — 구현 계획서 작성

### Phase: 계획 수립

**작업 내용**
- `docs/plan-update-gemini-models-2026-03.md` 작성 (8차 리뷰 반영 최종본)
- Gemini API 모델 라인업 변경사항 조사 및 정리
- 9단계 구현 계획 수립

**기술적 결정**
- `DEPRECATED_MODELS`를 `src/config/deprecated.ts` 별도 파일로 분리
  - 검토: `src/types/models.ts`에 함께 넣는 방안 vs 별도 파일
  - 결정: 별도 파일. `models.ts`는 auto-generated 파일이므로 `npm run update-models` 실행 시 수동 코드가 덮어씌워질 위험 있음
- `DEFAULT_FALLBACK_ORDER` 3번째를 `gemini-3.1-flash-lite-preview`로 변경
  - 검토: `gemini-2.5-flash-lite` 유지 vs `gemini-3.1-flash-lite-preview` 전환
  - 결정: 전환. `gemini-2.5-flash-lite`는 2026-07-22 종료 예정이고, `gemini-3.1-flash-lite-preview`가 더 최신 모델
  - 리스크: preview 모델이 기본 fallback에 2개 포함되지만, stable 모델 전부 종료 예정이라 불가피
- `fetch-models.ts` 필터링 조건을 `major === maxMajor`로 완화
  - 검토: minor까지 정확히 매칭 vs major만 매칭
  - 결정: major만 매칭. minor까지 매칭하면 `gemini-3-flash-preview`(3.0)가 `gemini-3.1-*` 추가 시 필터에서 탈락하는 버그 발생
  - 부작용: 같은 major의 구버전도 포함될 수 있으나 현재 major=3 모델은 소수라 실질적 문제 없음
- Breaking Change 전략: `gemini-3-pro-preview` 제거를 minor bump(v0.6.0)에서 수행
  - 근거: 0.x 버전이므로 semver상 minor에서 breaking change 허용. 해당 모델은 이미 2026-03-09에 종료되어 API 호출 자체 불가
