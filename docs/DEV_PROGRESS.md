# Gemini 모델 업데이트 v0.6.0 - 개발 진행 현황

> 계획서: [docs/plan-update-gemini-models-2026-03.md](./plan-update-gemini-models-2026-03.md)
> 브랜치: `feat/support-and-deprecated-gemini-model`
> 시작일: 2026-03-13

## 상태 범례

- ⬜ 미착수
- 🔧 진행 중
- ✅ 완료
- ⏸️ 보류
- ❌ 차단됨

---

## Phase 1: 코어 타입 및 설정 변경

| # | 작업 항목 | 파일 | 상태 | 비고 |
|---|----------|------|------|------|
| 1-1 | `GeminiModel` 타입 수정 (신규 모델 추가, `gemini-3-pro-preview` 제거) | `src/types/models.ts` | ⬜ | |
| 1-2 | `DEFAULT_FALLBACK_ORDER` 업데이트 | `src/types/models.ts` | ⬜ | |
| 1-3 | `ALL_MODELS` 배열 업데이트 | `src/types/models.ts` | ⬜ | |

## Phase 2: Deprecated 모델 설정

| # | 작업 항목 | 파일 | 상태 | 비고 |
|---|----------|------|------|------|
| 2-1 | `DeprecatedModelInfo` 인터페이스 + `DEPRECATED_MODELS` 상수 생성 | `src/config/deprecated.ts` | ⬜ | 신규 파일 |
| 2-2 | `MODEL_PRIORITY`에 신규 모델 추가, `gemini-3-pro-preview` 제거 | `src/config/models.ts` | ⬜ | |
| 2-3 | `MODEL_INFO`에 신규 모델 메타데이터 추가 | `src/config/models.ts` | ⬜ | |
| 2-4 | `DEPRECATED_MODELS`, `DeprecatedModelInfo` export 추가 | `src/index.ts` | ⬜ | |

## Phase 3: 스크립트 버그 수정

| # | 작업 항목 | 파일 | 상태 | 비고 |
|---|----------|------|------|------|
| 3-1 | `targetFallbackOrder` 배열 업데이트 | `scripts/generate-models.ts` | ⬜ | |
| 3-2 | `extractVersion()` 정규식 버그 수정 | `scripts/generate-models.ts` | ⬜ | |
| 3-3 | 필터링 로직 수정 (`isLatest` 조건 완화) | `scripts/fetch-models.ts` | ⬜ | |

## Phase 4: Deprecation 경고 기능

| # | 작업 항목 | 파일 | 상태 | 비고 |
|---|----------|------|------|------|
| 4-1 | `DEPRECATED_MODELS` import 추가 | `src/client/FallbackClient.ts` | ⬜ | |
| 4-2 | `warnedDeprecatedModels` Set 프로퍼티 추가 | `src/client/FallbackClient.ts` | ⬜ | |
| 4-3 | 생성자에서 fallbackOrder 내 deprecated 모델 경고 | `src/client/FallbackClient.ts` | ⬜ | |
| 4-4 | `checkDeprecatedModel()` private 메서드 추가 | `src/client/FallbackClient.ts` | ⬜ | |
| 4-5 | 4개 public 메서드에서 `checkDeprecatedModel()` 호출 | `src/client/FallbackClient.ts` | ⬜ | `generate`, `generateStream`, `generateContent`, `generateContentStream` |

## Phase 5: 중간 검증

| # | 작업 항목 | 상태 | 비고 |
|---|----------|------|------|
| 5-1 | `npm run typecheck` 통과 | ⬜ | |
| 5-2 | `npm test` 통과 (기존 테스트 깨질 수 있음, Phase 6에서 수정) | ⬜ | |
| 5-3 | `npm run lint:fix` 통과 | ⬜ | |

## Phase 6: 테스트 업데이트

| # | 작업 항목 | 파일 | 상태 | 비고 |
|---|----------|------|------|------|
| 6-1 | 모델 목록 검증 업데이트 | `tests/unit/models.test.ts` | ⬜ | |
| 6-2 | fallback 3번째 모델 참조 변경 | `tests/unit/fallback.test.ts` | ⬜ | |
| 6-3 | 모델 수/이름 업데이트 | `tests/unit/health-monitor.test.ts` | ⬜ | |
| 6-4 | fallback 순서 참조 전체 변경 | `tests/integration/fallback-flow.test.ts` | ⬜ | |
| 6-5 | deprecation 경고 기능 테스트 작성 | `tests/unit/deprecated.test.ts` | ⬜ | 신규 파일 |

## Phase 7: 테스트 검증

| # | 작업 항목 | 상태 | 비고 |
|---|----------|------|------|
| 7-1 | `npm test` 전체 통과 | ⬜ | |

## Phase 8: 예제 및 문서 업데이트

| # | 작업 항목 | 파일 | 상태 | 비고 |
|---|----------|------|------|------|
| 8-1 | deprecated 모델 → 최신 모델로 교체 | `examples/custom-fallback.ts` | ⬜ | |
| 8-2 | 버전 0.5.0 → 0.6.0 | `package.json` | ⬜ | |
| 8-3 | 지원 모델 목록, fallback 예시 업데이트 | `README.md` | ⬜ | |
| 8-4 | 한국어 README 동기화 | `README.ko.md` | ⬜ | |
| 8-5 | fallback order 설명 업데이트 | `GEMINI.md` | ⬜ | |
| 8-6 | 모델 목록, 모델 수, 경로 오류 수정 | `CLAUDE.md` | ⬜ | |
| 8-7 | v0.6.0 릴리스 노트 + 마이그레이션 가이드 | `CHANGELOG.md` | ⬜ | |

## Phase 9: 최종 검증

| # | 작업 항목 | 상태 | 비고 |
|---|----------|------|------|
| 9-1 | `npm install` (package-lock.json 갱신) | ⬜ | |
| 9-2 | `npm run prepublishOnly` 통과 | ⬜ | |
