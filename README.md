# 💎 Gem Back

> Smart Gemini API Fallback Library for Node.js & TypeScript

[![npm version](https://badge.fury.io/js/gemback.svg)](https://www.npmjs.com/package/gemback)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Gem Back**은 Google Gemini API의 RPM(Requests Per Minute) 제한을 자동으로 처리하는 Fallback 시스템을 제공하는 NPM 라이브러리입니다.

---

## 🎯 왜 Gem Back인가?

Gemini API는 무료 티어에서 **RPM(분당 요청 수) 제한**이 있어, 높은 트래픽 상황에서 `429 Too Many Requests` 에러가 발생합니다. Gem Back은 이 문제를 다음과 같이 해결합니다:

### 핵심 기능 ✨

- ✅ **자동 Fallback**: 한 모델이 실패하면 자동으로 다음 모델로 전환
- ✅ **스마트 재시도**: Exponential Backoff로 일시적 오류 처리
- ✅ **멀티 API 키 로테이션**: 여러 API 키를 자동으로 순환하여 RPM 제한 우회
- ✅ **스트리밍 지원**: 실시간 응답 스트리밍 (`generateStream()`)
- ✅ **대화형 인터페이스**: 멀티턴 대화 지원 (`chat()`)
- ✅ **통계 추적**: 모델별/키별 사용률 및 성공률 모니터링
- ✅ **제로 설정**: 기본 설정만으로 바로 사용 가능
- ✅ **완벽한 타입 지원**: TypeScript로 작성되어 자동완성 지원
- ✅ **이중 모듈**: CommonJS + ESM 동시 지원
- ✅ **완전한 테스트**: 165개 테스트로 검증된 안정성
- ✅ **모니터링 & 추적**: Rate limiting 예측 및 모델 Health 모니터링

---

## 🚀 지원 모델

Gem Back은 다음 4개 모델의 Fallback 체인을 지원합니다:

```
gemini-2.5-flash (최신, 최고 성능)
  ↓ 실패 시
gemini-2.5-flash-lite (경량 버전)
  ↓ 실패 시
gemini-2.0-flash (안정 버전)
  ↓ 실패 시
gemini-2.0-flash-lite (경량 안정 버전)
```

---

## 📦 설치

```bash
npm install gemback
# 또는
yarn add gemback
# 또는
pnpm add gemback
```

---

## ⚡ 빠른 시작

### 기본 사용법

```typescript
import { GeminiBackClient } from 'gemback';

// 클라이언트 생성
const client = new GeminiBackClient({
  apiKey: process.env.GEMINI_API_KEY
});

// 텍스트 생성
const response = await client.generate('안녕하세요, Gemini!');
console.log(response.text);
// 자동으로 최적의 모델을 선택하여 응답
```

### 커스텀 Fallback 순서

```typescript
const client = new GeminiBackClient({
  apiKey: process.env.GEMINI_API_KEY,
  fallbackOrder: [
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ],
  maxRetries: 3,
  timeout: 30000,
  debug: true // 상세 로그 출력
});
```

### 스트리밍 응답

```typescript
const stream = await client.generateStream('긴 이야기를 들려주세요');

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### 멀티 API 키 로테이션 (신규!)

여러 API 키를 사용하여 RPM 제한을 효과적으로 우회할 수 있습니다:

```typescript
const client = new GeminiBackClient({
  apiKeys: [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ],
  apiKeyRotationStrategy: 'round-robin' // 또는 'least-used'
});

// 각 요청마다 자동으로 다른 API 키를 사용
const response1 = await client.generate('첫 번째 질문'); // key_1 사용
const response2 = await client.generate('두 번째 질문'); // key_2 사용
const response3 = await client.generate('세 번째 질문'); // key_3 사용

// 키별 사용 통계 확인
const stats = client.getFallbackStats();
console.log(stats.apiKeyStats); // 각 키의 사용량, 성공률 등
```

**로테이션 전략:**
- `round-robin` (기본값): 순차적으로 키를 순환
- `least-used`: 가장 적게 사용된 키를 우선 선택

### 모니터링 & 추적 (신규!)

실시간 Rate Limiting 추적 및 모델 Health 모니터링으로 안정성을 향상시킬 수 있습니다:

```typescript
const client = new GeminiBackClient({
  apiKey: process.env.GEMINI_API_KEY,
  enableMonitoring: true  // 모니터링 활성화
});

// API 사용
await client.generate('질문 1');
await client.generate('질문 2');
// ...

// 상세 모니터링 통계 조회
const stats = client.getFallbackStats();

// Rate Limit 상태 확인
console.log(stats.monitoring?.rateLimitStatus);
// [
//   {
//     model: 'gemini-2.5-flash',
//     currentRPM: 5,          // 현재 분당 요청 수
//     maxRPM: 15,             // 최대 RPM
//     utilizationPercent: 33, // 사용률
//     isNearLimit: false,     // 한계 접근 여부
//     willExceedSoon: false,  // 곧 초과 예상 여부
//     windowStats: {
//       requestsInLastMinute: 5,
//       requestsInLast5Minutes: 12,
//       averageRPM: 2.4
//     }
//   }
// ]

// 모델 Health 상태 확인
console.log(stats.monitoring?.modelHealth);
// [
//   {
//     model: 'gemini-2.5-flash',
//     status: 'healthy',           // healthy | degraded | unhealthy
//     successRate: 0.98,           // 성공률
//     averageResponseTime: 1234,   // 평균 응답 시간 (ms)
//     availability: 0.99,          // 가용성
//     consecutiveFailures: 0,      // 연속 실패 횟수
//     metrics: {
//       totalRequests: 100,
//       successfulRequests: 98,
//       failedRequests: 2,
//       p50ResponseTime: 1100,     // 50th percentile
//       p95ResponseTime: 1800,     // 95th percentile
//       p99ResponseTime: 2100      // 99th percentile
//     }
//   }
// ]

// 종합 요약
console.log(stats.monitoring?.summary);
// {
//   healthyModels: 3,
//   degradedModels: 1,
//   unhealthyModels: 0,
//   overallSuccessRate: 0.96,
//   averageResponseTime: 1500
// }
```

**모니터링 기능:**
- ✅ **Rate Limit 추적**: 모델별 RPM 사용량 실시간 추적
- ✅ **사전 경고**: 한계 도달 전 자동 경고 (80%, 90% 임계값)
- ✅ **Health Monitoring**: 모델별 성공률, 응답 시간, 가용성 추적
- ✅ **Percentile 메트릭**: p50, p95, p99 응답 시간 분석
- ✅ **연속 실패 감지**: 모델 상태 자동 감지 (healthy/degraded/unhealthy)

---

## 📖 주요 기능

### 1. 자동 Fallback

```typescript
// gemini-2.5-flash가 RPM 제한에 걸리면
// 자동으로 gemini-2.5-flash-lite로 전환
const response = await client.generate('복잡한 질문');
```

### 2. 재시도 로직

```typescript
const client = new GeminiBackClient({
  apiKey: 'YOUR_KEY',
  maxRetries: 3, // 각 모델당 최대 3번 재시도
  retryDelay: 1000 // 초기 재시도 대기 시간 (ms)
});
```

### 3. 에러 처리

```typescript
try {
  const response = await client.generate('Hello');
} catch (error) {
  if (error instanceof GeminiBackError) {
    console.log('시도한 모델들:', error.allAttempts);
    console.log('마지막 에러:', error.message);
  }
}
```

### 4. 통계 조회

```typescript
const stats = client.getFallbackStats();
console.log(stats);
// {
//   totalRequests: 100,
//   successRate: 0.95,
//   modelUsage: {
//     'gemini-2.5-flash': 70,
//     'gemini-2.5-flash-lite': 25,
//     'gemini-2.0-flash': 5
//   },
//   apiKeyStats: [  // 멀티 키 모드일 때만 제공
//     {
//       keyIndex: 0,
//       totalRequests: 35,
//       successCount: 33,
//       failureCount: 2,
//       successRate: 0.94,
//       lastUsed: Date
//     },
//     // ... 다른 키들
//   ]
// }
```

---

## 🔧 API 레퍼런스

### `GeminiBackClient`

#### Constructor Options

```typescript
interface GeminiBackClientOptions {
  apiKey?: string;                   // Gemini API 키 (단일 키)
  apiKeys?: string[];                // 여러 API 키 (멀티 키 모드)
  fallbackOrder?: GeminiModel[];     // 선택: Fallback 순서
  maxRetries?: number;               // 선택: 최대 재시도 횟수 (기본: 2)
  timeout?: number;                  // 선택: 요청 타임아웃 (기본: 30000ms)
  retryDelay?: number;               // 선택: 초기 재시도 대기 시간 (기본: 1000ms)
  debug?: boolean;                   // 선택: 디버그 로그 (기본: false)
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  apiKeyRotationStrategy?: 'round-robin' | 'least-used'; // 키 로테이션 전략 (기본: round-robin)
  enableMonitoring?: boolean;        // 선택: 모니터링 활성화 (기본: false)
  enableRateLimitPrediction?: boolean; // 선택: Rate limit 예측 경고 (기본: false)
}
```

**참고:** `apiKey` 또는 `apiKeys` 중 하나는 반드시 제공해야 합니다.

#### 메서드

##### `generate(prompt, options?)`

단일 텍스트 생성 요청

```typescript
const response = await client.generate('Hello!', {
  model: 'gemini-2.5-flash',  // 특정 모델 지정
  temperature: 0.7,
  maxTokens: 1000
});
```

##### `generateStream(prompt, options?)`

스트리밍 텍스트 생성

```typescript
const stream = await client.generateStream('Tell me a story');
for await (const chunk of stream) {
  console.log(chunk.text);
}
```

##### `chat(messages, options?)`

대화형 인터페이스

```typescript
const response = await client.chat([
  { role: 'user', content: '안녕하세요' },
  { role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' },
  { role: 'user', content: 'TypeScript에 대해 알려주세요' }
]);
```

##### `getFallbackStats()`

Fallback 통계 조회

```typescript
const stats = client.getFallbackStats();
```

---

## ⚙️ 설정 옵션

### Fallback 동작 커스터마이징

```typescript
const client = new GeminiBackClient({
  apiKey: 'YOUR_KEY',

  // 사용할 모델만 지정
  fallbackOrder: [
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite'
  ],

  // 재시도 설정
  maxRetries: 3,
  retryDelay: 2000,

  // 타임아웃 설정
  timeout: 60000,

  // 로깅 설정
  debug: true,
  logLevel: 'info'
});
```

---

## 🔄 Fallback 동작 방식

### 처리 시나리오

| 에러 타입 | 처리 방법 |
|-----------|-----------|
| **429 RPM 제한** | ⚡ 즉시 다음 모델로 Fallback |
| **5xx 서버 에러** | 🔄 재시도 후 다음 모델 |
| **타임아웃** | 🔄 재시도 후 다음 모델 |
| **401/403 인증 에러** | ❌ 즉시 실패 (Fallback 중단) |
| **모든 모델 실패** | ❌ 상세 에러 정보 반환 |

### 재시도 전략

- **Exponential Backoff**: 1초 → 2초 → 4초 → ...
- **재시도 가능 에러**: 5xx, Timeout, Network Error
- **재시도 불가 에러**: 4xx (429 제외), 인증 에러

---

## 📊 로깅 예시

`debug: true`로 설정 시:

```
[GemBack] Attempting: gemini-2.5-flash
[GemBack] Failed (429 RPM Limit): gemini-2.5-flash
[GemBack] Fallback to: gemini-2.5-flash-lite
[GemBack] Retry attempt 1/2: gemini-2.5-flash-lite
[GemBack] Success: gemini-2.5-flash-lite (2nd attempt)
```

---

## 🗺️ 로드맵

### Phase 1: Core Features ✅ (완료 - v0.1.0)
- [x] 프로젝트 구조 설계
- [x] 기본 Fallback 로직
- [x] 4개 모델 지원
- [x] TypeScript 타입 정의
- [x] 자동 재시도 with Exponential Backoff
- [x] 스트리밍 응답 지원
- [x] 대화형 인터페이스 (chat)
- [x] 통계 추적 기능
- [x] 완전한 테스트 커버리지 (100개 테스트)
- [x] 종합 문서화 및 예제

### Phase 2: Advanced Features (진행 중)

Phase 2에서는 프로덕션 환경에서의 안정성과 성능을 향상시키는 고급 기능들을 추가할 예정입니다.

#### 📊 모니터링 & 추적 ✅ (v0.2.0)
- [x] **Rate Limiting 추적 및 예측**
  - 각 모델별 사용량 실시간 추적
  - RPM 제한 도달 예측 및 사전 경고 (80%, 90% 임계값)
  - 슬라이딩 윈도우 기반 사용 패턴 분석 (1분, 5분)

- [x] **Health Check 및 모델 상태 모니터링**
  - 모델별 상태 체크 (응답 시간, 성공률, 가용성)
  - 실시간 모델 Health 상태 (healthy/degraded/unhealthy)
  - Percentile 기반 성능 메트릭 (p50, p95, p99)
  - 연속 실패 감지 및 추적

#### ⚡ 성능 최적화
- [ ] **응답 캐싱 (중복 요청 최적화)**
  - 동일 요청에 대한 캐싱으로 API 호출 절감
  - TTL 기반 캐시 만료 관리
  - 메모리 효율적인 캐시 전략

- [ ] **Connection Pooling**
  - HTTP 연결 재사용으로 성능 향상
  - 동시 요청 처리 최적화
  - 리소스 사용 효율화

#### 🔐 안정성 & 확장성
- [x] **멀티 API 키 지원 및 로테이션** ✅
  - 여러 API 키를 활용한 로드 밸런싱
  - 자동 키 로테이션으로 RPM 제한 우회 (round-robin, least-used 전략)
  - 키별 사용량 추적 및 관리

- [ ] **Circuit Breaker 패턴**
  - 지속적 실패 시 일시적 차단
  - 자동 복구 및 재시도
  - 시스템 과부하 방지

### Phase 3: Ecosystem (향후 계획)
- [ ] CLI 도구
- [ ] 웹 대시보드 (실시간 모니터링)
- [ ] 모니터링 통합 (Prometheus, Grafana)
- [ ] 추가 AI 모델 지원 (Claude, GPT 등)

---

## 🤝 기여하기

기여를 환영합니다! 다음 방법으로 참여할 수 있습니다:

1. 이슈 리포트
2. 기능 제안
3. Pull Request
4. 문서 개선

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포할 수 있습니다.

---

## 🔗 링크

- **문서**: [API Documentation](https://github.com/Laeyoung/gem-back/docs)
- **이슈**: [GitHub Issues](https://github.com/Laeyoung/gem-back/issues)
- **NPM**: [npm package](https://www.npmjs.com/package/gemback)
- **Gemini API**: [Google AI Gemini](https://ai.google.dev/docs)

---

## 💡 FAQ

### Q: API 키는 어디서 발급받나요?
A: [Google AI Studio](https://makersuite.google.com/app/apikey)에서 무료로 발급받을 수 있습니다.

### Q: 모든 모델이 실패하면 어떻게 되나요?
A: `GeminiBackError`를 throw하며, 모든 시도 내역이 포함됩니다.

### Q: 특정 모델만 사용하고 싶어요
A: `fallbackOrder` 옵션에 원하는 모델만 배열로 전달하세요.

### Q: 비용은 어떻게 되나요?
A: Gemini API 자체 비용만 발생하며, Gem Back은 무료 오픈소스입니다.

---

**Made with ❤️ by Laeyoung**
