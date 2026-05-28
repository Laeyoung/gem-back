# 개발 로그 (Development Log)

> 최신 항목이 가장 위에 위치합니다.
> 관련 문서: [v0.7 계획서](./plan-free-tier-models-2026-05.md) | [v0.6 계획서](./plan-update-gemini-models-2026-03.md) | [진행 현황](./DEV_PROGRESS.md)

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
