# Gem Back (Gemini API Fallback) - 프로젝트 플랜

## 프로젝트 개요

Gemini API의 무료 유저 Quota RPM 제약을 해결하기 위한 다중 모델 Fallback 시스템을 제공하는 NPM Library

### 지원 모델
- `gemini-2.5-flash` (최신, 최고 성능)
- `gemini-2.5-flash-lite` (경량 버전)
- `gemini-2.0-flash` (안정 버전)
- `gemini-2.0-flash-lite` (경량 안정 버전)

---

## 1️⃣ 프로젝트 기본 설정

### 필요 파일
- `package.json` - NPM 패키지 메타데이터
- `tsconfig.json` - TypeScript 설정
- `.eslintrc.json` - ESLint 설정
- `.prettierrc` - Prettier 설정
- `.gitignore` - Git 제외 파일
- 빌드 시스템 설정 (TypeScript → JavaScript 변환)

### 개발 의존성
- TypeScript
- ESLint
- Prettier
- Jest/Vitest (테스팅)
- TypeDoc (문서 생성)

---

## 2️⃣ 핵심 타입 정의

```
src/types/
├── models.ts          # 지원 모델 타입 정의
├── config.ts          # 설정 타입
├── response.ts        # API 응답 타입
└── errors.ts          # 커스텀 에러 타입
```

### 주요 타입
- `GeminiModel`: 4개 모델 열거형
- `FallbackConfig`: Fallback 순서, 재시도 설정
- `GeminiAPIKey`: API 키 관리 타입
- `FallbackError`: 에러 정보
- `APIResponse`: 통합 응답 타입

---

## 3️⃣ 핵심 기능 구현

```
src/
├── client/
│   ├── GeminiClient.ts         # 개별 Gemini API 호출
│   └── FallbackClient.ts       # Fallback 로직 핵심
├── config/
│   ├── models.ts               # 모델 설정 (우선순위)
│   └── defaults.ts             # 기본 설정값
├── utils/
│   ├── retry.ts                # 재시도 로직
│   ├── logger.ts               # 로깅 유틸
│   └── error-handler.ts        # 에러 처리
└── index.ts                    # Public API 엔트리포인트
```

### 주요 클래스
- **GeminiClient**: 단일 모델 API 호출 담당
- **FallbackClient**: Fallback 체인 관리
  - 모델 우선순위 관리
  - 실패 시 다음 모델 자동 시도
  - RPM 제한 감지 및 처리
  - 재시도 로직 통합

---

## 4️⃣ Fallback 로직 설계

### 기본 Fallback 순서
```
gemini-2.5-flash
  ↓ (실패 시)
gemini-2.5-flash-lite
  ↓ (실패 시)
gemini-2.0-flash
  ↓ (실패 시)
gemini-2.0-flash-lite
  ↓ (모두 실패)
종합 에러 반환
```

### 처리 시나리오
| 에러 타입 | 처리 방법 |
|-----------|-----------|
| RPM 제한 에러 (429) | 즉시 다음 모델로 Fallback |
| 서버 에러 (5xx) | 재시도 후 다음 모델 |
| 타임아웃 | 재시도 후 다음 모델 |
| 인증 에러 (401/403) | 즉시 실패 (Fallback 중단) |
| 모든 모델 실패 | 종합 에러 정보 반환 |

### 재시도 전략
- 기본 재시도 횟수: 2회
- Exponential Backoff: 1초, 2초, 4초...
- 재시도 가능 에러: 5xx, Timeout, Network Error
- 재시도 불가 에러: 4xx (429 제외), 인증 에러

---

## 5️⃣ API 인터페이스

### 기본 사용법
```typescript
import { GeminiBackClient } from 'gem-back';

// 기본 사용
const client = new GeminiBackClient({
  apiKey: 'YOUR_API_KEY'
});

const response = await client.generate('Hello, Gemini!');
console.log(response.text);
```

### 커스텀 설정
```typescript
// 커스텀 Fallback 순서
const client = new GeminiBackClient({
  apiKey: 'YOUR_API_KEY',
  fallbackOrder: [
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ],
  maxRetries: 3,
  timeout: 30000,
  debug: true
});

// 특정 모델 지정
const response = await client.generate('Hello!', {
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 1000
});
```

### 스트리밍 지원
```typescript
// 스트리밍 응답
const stream = await client.generateStream('Tell me a story');

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### 주요 메서드
- `generate(prompt, options?)`: 텍스트 생성
- `generateStream(prompt, options?)`: 스트리밍 생성
- `chat(messages, options?)`: 대화형 인터페이스
- `getFallbackStats()`: Fallback 통계 조회

---

## 6️⃣ 에러 처리 및 로깅

### 에러 타입
```typescript
class GeminiBackError extends Error {
  code: string;
  statusCode?: number;
  modelAttempted?: string;
  allAttempts: Array<{
    model: string;
    error: string;
    timestamp: Date;
  }>;
}
```

### 로깅 레벨
- `debug`: 모든 시도 및 응답 로깅
- `info`: Fallback 발생 시 로깅
- `warn`: 재시도 발생 시 로깅
- `error`: 최종 실패 시 로깅
- `silent`: 로깅 비활성화

### 로깅 예시
```
[GemBack] Attempting: gemini-2.5-flash
[GemBack] Failed (429 RPM Limit): gemini-2.5-flash
[GemBack] Fallback to: gemini-2.5-flash-lite
[GemBack] Success: gemini-2.5-flash-lite (2nd attempt)
```

---

## 7️⃣ 테스트 전략

```
tests/
├── unit/
│   ├── client.test.ts           # GeminiClient 단위 테스트
│   ├── fallback.test.ts         # FallbackClient 단위 테스트
│   ├── retry.test.ts            # 재시도 로직 테스트
│   └── error-handler.test.ts   # 에러 처리 테스트
├── integration/
│   ├── api.test.ts              # 실제 API 통합 테스트
│   └── fallback-flow.test.ts   # Fallback 플로우 테스트
└── mocks/
    └── gemini-api-mock.ts       # API Mock 구현
```

### 테스트 커버리지 목표
- 단위 테스트: 90% 이상
- 통합 테스트: 주요 시나리오 커버
- E2E 테스트: 실제 API 호출 (선택적)

### 테스트 시나리오
1. 단일 모델 성공
2. 첫 번째 모델 실패 → 두 번째 모델 성공
3. 모든 모델 실패
4. 재시도 로직 검증
5. 타임아웃 처리
6. 스트리밍 응답
7. 에러 핸들링

---

## 8️⃣ 문서화

### README.md
- 프로젝트 소개
- 설치 방법
- 빠른 시작 가이드
- API 레퍼런스
- 사용 예제
- Fallback 동작 설명
- 설정 옵션
- FAQ

### 추가 문서
- `CHANGELOG.md` - 버전별 변경사항
- `CONTRIBUTING.md` - 기여 가이드
- `LICENSE` - 라이선스 (MIT 권장)
- `API.md` - 상세 API 문서 (TypeDoc 생성)

### 예제
```
examples/
├── basic-usage.ts
├── custom-fallback.ts
├── streaming.ts
├── error-handling.ts
└── advanced-config.ts
```

---

## 9️⃣ 배포 준비

### NPM 퍼블리싱
- 패키지 이름: `gem-back` 또는 `gemini-fallback`
- Scope: `@your-org/gem-back` (선택적)
- 초기 버전: `0.1.0`
- 라이선스: MIT

### 버전 관리 (Semantic Versioning)
- Major (X.0.0): Breaking changes
- Minor (0.X.0): 새로운 기능 추가
- Patch (0.0.X): 버그 수정

### CI/CD (GitHub Actions)
```
.github/workflows/
├── test.yml           # PR/Push 시 자동 테스트
├── build.yml          # 빌드 검증
├── publish.yml        # NPM 자동 배포
└── docs.yml           # 문서 자동 생성
```

### 빌드 설정
- TypeScript 컴파일: CommonJS + ESM 모듈 지원
- Source maps 생성
- Declaration files (.d.ts) 생성
- Minification (선택적)

---

## 🔟 추가 고려사항

### Phase 2 기능 (선택적)
- **Rate Limiting 추적**: 각 모델별 사용량 추적
- **캐싱**: 동일 요청 캐싱으로 API 호출 절감
- **통계**: Fallback 성공률, 모델별 성공률 통계
- **멀티 API 키 지원**: 여러 API 키 로테이션
- **Health Check**: 모델별 상태 체크
- **Circuit Breaker**: 지속적 실패 시 일시적 차단

### 보안 고려사항
- API 키 환경변수 사용 권장
- API 키 로깅 방지
- HTTPS 강제

### 성능 최적화
- Connection pooling
- Request batching (가능한 경우)
- Response caching
- Timeout 최적화

---

## 📝 구현 순서

### Phase 1: 기본 설정 (1-2일)
- [x] Git repository 초기화
- [ ] `package.json` 설정
- [ ] TypeScript 설정
- [ ] ESLint/Prettier 설정
- [ ] 프로젝트 구조 생성
- [ ] `.gitignore` 추가

### Phase 2: 핵심 로직 (3-4일)
- [ ] 타입 정의 (`src/types/`)
- [ ] `GeminiClient` 구현
- [ ] `FallbackClient` 구현
- [ ] 기본 설정 (`src/config/`)

### Phase 3: 에러 처리 (2-3일)
- [ ] 재시도 로직 (`src/utils/retry.ts`)
- [ ] 에러 핸들러 (`src/utils/error-handler.ts`)
- [ ] 로깅 시스템 (`src/utils/logger.ts`)

### Phase 4: 테스트 (3-4일)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Mock 구현
- [ ] 테스트 커버리지 확인

### Phase 5: 문서화 (2-3일)
- [ ] README.md 작성
- [ ] API 문서 생성
- [ ] 예제 코드 작성
- [ ] CHANGELOG.md 작성

### Phase 6: 배포 (1-2일)
- [ ] NPM 패키지 설정
- [ ] CI/CD 파이프라인 구축
- [ ] 첫 배포 (`0.1.0`)
- [ ] 배포 후 검증

---

## 성공 지표

- ✅ 4개 모델 모두 정상 동작
- ✅ Fallback 로직 정확히 작동
- ✅ 테스트 커버리지 90% 이상
- ✅ NPM 배포 성공
- ✅ 문서화 완료
- ✅ 실제 사용 사례 검증

---

## 참고 자료

- [Google AI Gemini API Documentation](https://ai.google.dev/docs)
- [Gemini API Rate Limits](https://ai.google.dev/pricing)
- [TypeScript Best Practices](https://typescript-eslint.io/)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules)
