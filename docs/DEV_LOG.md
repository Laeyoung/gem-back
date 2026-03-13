# 개발 로그 (Development Log)

> 최신 항목이 가장 위에 위치합니다.
> 관련 문서: [계획서](./plan-update-gemini-models-2026-03.md) | [진행 현황](./DEV_PROGRESS.md)

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
