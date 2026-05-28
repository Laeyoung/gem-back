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

| 사용자 표기 | RPM | TPM | RPD | 추정 모델 ID | 현재 ALL_MODELS |
|---|---|---|---|---|---|
| Gemini 2.5 Flash | 5 | 250K | 20 | `gemini-2.5-flash` | ✅ |
| Gemini 2.5 Flash Lite | 10 | 250K | 20 | `gemini-2.5-flash-lite` | ✅ |
| Gemini 3 Flash | 5 | 250K | 20 | `gemini-3-flash-preview` (요확인) | ✅ |
| Gemini 3.1 Flash Lite | 15 | 250K | 500 | `gemini-3.1-flash-lite-preview` (요확인) | ✅ |
| **Gemini 3.5 Flash** | **5** | **250K** | **20** | **`gemini-3.5-flash` (요확인)** | **❌ 신규** |

Free-tier 미제공 (현재 지원 중이지만 quota 0):
- `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3.1-pro-preview`

> **주의**: 사용자가 제공한 표기는 마케팅 명칭이다. 실제 API ID, 그리고 `-preview` suffix가 stable 전환된 모델이 있는지는 Phase 1에서 `npm run fetch-models`로 확정한다.

## 3. 목표 및 비목표

### 목표
1. 신규 모델 `gemini-3.5-flash`(이름은 fetch-models로 확정)를 `ALL_MODELS`와 `MODEL_INFO`에 추가
2. **API에서 사라진 모델을 `ALL_MODELS`에서 제거** (예: 3.5 출시와 함께 3.1 일부가 사라진 케이스). 기존 deprecation 시스템과 결합해 안전 전환 절차를 따른다.
3. `RateLimitTracker`가 모델별 정확한 RPM/RPD를 사용하도록 모델별 default limits 테이블 추가
4. **TPM 추적 추가** — 250K TPM 한도 예측 및 경고
5. `DEFAULT_FALLBACK_ORDER`를 free-tier 친화적으로 재구성 (RPD 합산 최대화)
6. Free-tier에서 빠진 모델에 대해 사용 시 런타임 경고 (deprecation 시스템과 별도, "no free tier" 라벨)

### 비목표
- 자동 파싱 시스템 구축 (별도 plan-auto-free-tier-update.md에서 다룸)
- 유료 모델의 enterprise quota 반영
- Paid tier user를 위한 별도 fallback chain (지금은 옵션으로 외부 주입만 권장)

## 4. 신규 DEFAULT_FALLBACK_ORDER 제안

Free-tier 사용자의 일일 처리량 최대화 관점에서, RPD 합산이 가장 큰 조합을 우선한다:

```
1. gemini-3.1-flash-lite-preview   # 500 RPD — 일일 quota의 압도적 대부분
2. gemini-3.5-flash                # 20 RPD — 최신·최고 품질 모델 (신규)
3. gemini-3-flash-preview          # 20 RPD — 백업
```

대안으로 검토:
- **A) 품질 우선 (3.5 Flash → 3 Flash → 3.1 Flash Lite)**: 첫 호출 품질은 좋으나 20 RPD를 빠르게 소진해 fallback에 의존하게 됨.
- **B) RPD 우선 (제안안)**: 일일 사용량이 많은 챗봇·배치 사용자에게 유리. 첫 호출이 가장 가벼운 모델이라 품질은 살짝 낮을 수 있음.
- 본 plan은 라이브러리 자체 기본값으로 B를 택하고, README에 "품질이 중요하면 명시적 `fallbackOrder` 권장"을 문서화한다.

## 5. 변경 대상

### Phase 1: 모델 ID 확정 및 사라진 모델 감지 (수동 1회)
- [ ] `npm run fetch-models` 실행 후 `scripts/models-data.json` diff 확인
- [ ] "Gemini 3.5 Flash"의 canonical API ID 확정 (`gemini-3.5-flash` vs `gemini-3.5-flash-preview` 등)
- [ ] `-preview` suffix가 떨어진 모델 (3 Flash, 3.1 Flash Lite 등) 식별
- [ ] **API 응답에 더 이상 존재하지 않는 모델 식별 (= "사라진 모델")**. 현 시점 후보: 3.5 출시와 함께 disappear한 3.1 계열 일부. 확정은 `models-data.json` diff에서 `name` 키 비교로 수행.
- [ ] 사라진 모델을 §Phase 1.5의 제거 워크플로우로 넘김

### Phase 1.5: 사라진 모델 제거 (Removal Pipeline)

**정책**: API에서 사라진 모델은 다음 절차에 따라 제거한다. "free-tier 미제공" (API는 있으나 quota 0) 처리와 명확히 구분한다.

| 상태 | API 존재 | Free Tier | 처리 |
|---|---|---|---|
| Active free-tier | ✅ | ✅ | `ALL_MODELS`·`FREE_TIER_LIMITS` 포함 |
| Paid-only | ✅ | ❌ | `ALL_MODELS` 유지 + 런타임 경고 (§Phase 5) |
| **Removed from API** | **❌** | **N/A** | **`DEPRECATED_MODELS`로 1버전 격리 → 다음 메이저에서 `ALL_MODELS`에서 삭제** |

**전환 절차** (예: `gemini-3.1-pro-preview`가 사라졌다고 가정):
1. `src/config/deprecated.ts`의 `DEPRECATED_MODELS`에 항목 추가 — `shutdownDate`는 API에서 사라진 시점 (2026-05-28), `replacement`는 `gemini-3.5-flash`, `reason: 'removed_from_api'` 추가
2. `GeminiModel` 타입과 `ALL_MODELS` 배열에서는 v0.7.0에서 즉시 제거 (`generate-models.ts`의 출력이 그대로 반영)
3. `FallbackClient` 호출 시 사용자가 명시적으로 사라진 모델을 `fallbackOrder`에 지정하면:
   - v0.7.0: 첫 호출에서 `logger.error` 1회 + 즉시 다음 모델로 fallback (시도조차 하지 않음, `NoLongerExistsError` attempt 기록)
   - 호환성 shim 없음 — 사라진 모델이므로 시도해도 404
4. `DEPRECATED_MODELS` export는 유지되어 사용자가 자신의 코드에서 마이그레이션 가이드를 조회 가능

**`DeprecatedModelInfo` 확장**:
```ts
export interface DeprecatedModelInfo {
  shutdownDate: string;
  replacement: GeminiModel;
  reason: 'replaced_by_newer' | 'removed_from_api' | 'tier_change';  // NEW
  // ...
}
```

**`reason` 필드 동작**:
- `removed_from_api`: 즉시 fallback (위 절차)
- `replaced_by_newer`: 기존 v0.6.0 deprecation 경고 (호출 자체는 가능)
- `tier_change`: free-tier에서 빠진 paid-only 전환 (§Phase 5)

**`fetch-models`가 자동 감지하도록 (선택)**:
- `scripts/fetch-models.ts`에 "이전 `models-data.json`에 있었으나 새 응답에 없는 모델" diff 로직 추가
- 감지 시 CI 실패가 아니라 *경고 로그* + `models-data.json`에 `_removed:` 섹션 기록 → 사람이 PR로 처리
- 완전 자동화는 [plan-auto-free-tier-update.md](./plan-auto-free-tier-update.md)에 위임

### Phase 2: 모델 메타데이터
- [ ] `scripts/generate-models.ts`의 `targetFallbackOrder` 갱신 (위 §4 제안안)
- [ ] `npm run generate-models` → `src/types/models.ts`, `src/config/models.ts` 자동 갱신
- [ ] `src/config/models.ts`의 `MODEL_PRIORITY`에 신규 모델 priority 부여 (3.5 Flash는 3 Flash 직상위)

### Phase 3: 모델별 Rate Limit 기본값
- [ ] `src/monitoring/rate-limit-tracker.ts`: `RateLimitConfig`에 `tpm?: number` 필드 추가
- [ ] `defaultLimits` 초기화를 일괄 `{rpm:15, rpd:1500}` → 모델별 테이블로 변경. 신규 상수를 `src/config/free-tier-limits.ts`로 분리해 관리:
  ```ts
  export const FREE_TIER_LIMITS: Partial<Record<GeminiModel, RateLimitConfig>> = {
    'gemini-2.5-flash':              { rpm: 5,  tpm: 250_000, rpd: 20 },
    'gemini-2.5-flash-lite':         { rpm: 10, tpm: 250_000, rpd: 20 },
    'gemini-3-flash-preview':        { rpm: 5,  tpm: 250_000, rpd: 20 },
    'gemini-3.1-flash-lite-preview': { rpm: 15, tpm: 250_000, rpd: 500 },
    'gemini-3.5-flash':              { rpm: 5,  tpm: 250_000, rpd: 20 },
    // 이외 모델은 paid-tier 추정 — fallback default 유지
  };
  ```
- [ ] Free-tier 미제공 모델에 대해서는 별도 상수 `NON_FREE_TIER_MODELS`로 표시

### Phase 4: TPM 추적
- [ ] `RateLimitTracker` 내부 history를 `{ time: Date, tokens?: number }`로 확장
- [ ] `recordRequest(model, apiKeyIndex, tokensUsed?)` signature 추가 (기존 호출자 호환)
- [ ] `FallbackClient`가 응답의 `usageMetadata.totalTokenCount`를 추출해 트래커로 전달
- [ ] `getStatus()`에 `currentTPM`, `maxTPM`, `tpmUtilizationPercent` 추가
- [ ] `willExceedSoon`을 RPM·TPM·RPD 셋 중 가장 가까운 한계 기준으로 계산
- [ ] 예측 임계값 (80%/90%)을 TPM에도 동일 적용

### Phase 5: Free-tier 경고 (paid-only 모델용)
- [ ] `src/config/deprecated.ts`와 별개로, free-tier 미제공이지만 API에는 존재하는 모델 호출 시 첫 호출에서만 1회 `logger.warn` 출력
- [ ] 메시지 예: `[GemBack] Model "gemini-2.5-pro" is not on the free tier as of 2026-05-28; expect 4xx on free-tier API keys.`
- [ ] **사라진 모델과 혼동 금지**: 사라진 모델은 §Phase 1.5에서 `logger.error` + 즉시 fallback. 본 phase는 호출 시도 자체는 허용.

### Phase 6: 테스트
- [ ] `tests/unit/rate-limit-tracker.test.ts`에 모델별 한도 케이스 추가 (3.1 Flash Lite는 RPD 500, 나머지는 RPD 20)
- [ ] TPM 추적 케이스: 250K 한도, 80%/90% 예측
- [ ] `tests/integration/free-tier-fallback.test.ts` 신규: RPD 20인 모델 두 개를 빠르게 소진 후 3.1 Flash Lite로 fallback되는지 검증
- [ ] `tests/unit/removed-model.test.ts` 신규: 사라진 모델을 `fallbackOrder`에 명시한 경우 시도 없이 즉시 다음 모델로 넘어가는지 검증, `GeminiBackError.allAttempts`에 `reason: 'removed_from_api'` 기록 검증
- [ ] `npm run typecheck`, `npm test`, `npm run lint` 통과 확인

### Phase 7: 문서
- [ ] `README.md` / `README.ko.md`의 supported models 섹션 갱신, free-tier 표 첨부
- [ ] `CHANGELOG.md`에 v0.7.0 항목 추가
- [ ] `MONITORING.md`에 TPM 섹션 추가
- [ ] `docs/DEV_LOG.md` 상단에 Phase별 결정 기록
- [ ] `docs/DEV_PROGRESS.md` 신규 v0.7.0 섹션 생성

## 6. 검증

릴리스 차단 조건:
- [ ] `npm run prepublishOnly` 통과
- [ ] 모든 free-tier 모델에 대해 RPM/TPM/RPD가 위 §4 표와 일치하는 단위 테스트
- [ ] `gemback-0.7.0.tgz` 로컬 install 후 `examples/` 스니펫 실행 검증
- [ ] free-tier API key로 실제 API 호출하여 250K TPM 경고가 발생하는지 통합 테스트

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

---

## Appendix A: Free-tier 미제공 (API 존재, paid-only) 모델

| Model ID | 현재 상태 | v0.7 처리 |
|---|---|---|
| `gemini-2.5-pro` | ALL_MODELS 포함 | 유지 + free-tier 경고 |
| `gemini-2.0-flash` | ALL_MODELS 포함 | 유지 + free-tier 경고, 다음 분기에 deprecated 검토 |
| `gemini-2.0-flash-lite` | ALL_MODELS 포함 | 동일 |
| `gemini-3.1-pro-preview` | ALL_MODELS 포함 | 동일 |

## Appendix B: 사라진 모델 (Phase 1.5 대상)

Phase 1 (`npm run fetch-models`) 실행 후 채워짐. 사용자가 알려준 예시 (Gemini 3.1 → 3.5 supplant 케이스)에 따라 다음 후보를 우선 검증한다:

| 후보 Model ID | 검증 방법 | 사라진 경우 처리 |
|---|---|---|
| `gemini-3.1-flash-lite-preview` | 사용자 표에 있음 → 살아있음 추정 | (해당 없음, 유지) |
| `gemini-3.1-pro-preview` | 사용자 표에 0/0/0 → API 존재, paid 전환 | Appendix A로 이동 |
| (Phase 1에서 추가 발견 시) | `models-data.json` diff | Phase 1.5 절차 적용 |

> 본 표는 Phase 1 실행 결과에 따라 갱신된다. 만약 fetch-models가 `gemini-3.1-*` 계열을 더 이상 반환하지 않으면 위 표 첫 두 행을 Phase 1.5의 removal pipeline으로 이관한다.
