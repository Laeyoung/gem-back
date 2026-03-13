# 💎 Gem Back

> Smart Gemini API Fallback Library with Multi-Key Rotation & Monitoring

[![npm version](https://badge.fury.io/js/gemback.svg)](https://www.npmjs.com/package/gemback)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-247%20passing-brightgreen.svg)](https://github.com/Laeyoung/gem-back)

**Gem Back**은 Google Gemini API의 RPM(Requests Per Minute) 제한을 자동으로 처리하는 Fallback 시스템과 프로덕션급 모니터링 기능을 제공하는 NPM 라이브러리입니다.

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
- ✅ **완전한 테스트**: 235개 테스트로 검증된 안정성
- ✅ **모니터링 & 추적**: Rate limiting 예측 및 모델 Health 모니터링

---

## 🚀 지원 모델

Gem Back은 다음 모델들의 자동 Fallback을 지원합니다:

**기본 Fallback 체인** (무료 티어 최적화):
1. `gemini-3-flash-preview` (무료 쿼터 제공) ⚠️
2. `gemini-2.5-flash` (안정적, 고성능)
3. `gemini-3.1-flash-lite-preview` (경량 Fallback) ⚠️

**기타 지원 모델**:
- `gemini-3.1-pro-preview`
- `gemini-2.5-pro`
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`

**모델 자동 업데이트**: 이 라이브러리는 Google API 업데이트에 맞춰 모델 목록을 최신화하는 자동화 스크립트를 포함하고 있습니다. 상세 내용은 [Contributing Guide](./CONTRIBUTING.md)를 참조하세요.

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
import { GemBack } from 'gemback';

// 클라이언트 생성
const client = new GemBack({
  apiKey: process.env.GEMINI_API_KEY
});

// 텍스트 생성
const response = await client.generate('안녕하세요, Gemini!');
console.log(response.text);
// 자동으로 최적의 모델을 선택하여 응답
```

### 커스텀 Fallback 순서

```typescript
const client = new GemBack({
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
const client = new GemBack({
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
const client = new GemBack({
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
const client = new GemBack({
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
//   failureCount: 5,
//   modelUsage: {
//     'gemini-2.5-flash': 70,
//     'gemini-2.5-flash-lite': 30
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
//   ],
//   monitoring: {  // enableMonitoring: true일 때만 제공
//     rateLimitStatus: [...],  // 모델별 Rate Limit 상태
//     modelHealth: [...],      // 모델별 Health 상태
//     summary: {
//       healthyModels: 3,
//       degradedModels: 1,
//       unhealthyModels: 0,
//       overallSuccessRate: 0.96,
//       averageResponseTime: 1500
//     }
//   }
// }
```

### 5. System Instructions (v0.5.0+)

모델의 동작, 성격, 응답 스타일을 제어합니다:

```typescript
// 문자열 형식
const response = await client.generate('TypeScript를 설명해주세요', {
  systemInstruction: '당신은 친절한 프로그래밍 튜터입니다. 초보자를 위해 개념을 명확하게 설명하세요.',
});

// 구조화된 Content 형식
const response2 = await client.generate('async/await이 무엇인가요?', {
  systemInstruction: {
    role: 'user',
    parts: [{ text: '당신은 시니어 엔지니어입니다. 기술적이고 상세한 설명을 제공하세요.' }],
  },
});

// 모든 생성 메서드에서 작동
const stream = client.generateStream('프로미스를 설명해주세요', {
  systemInstruction: '설명을 100단어 이하로 유지하세요. 불릿 포인트를 사용하세요.',
});

const chatResponse = await client.chat(messages, {
  systemInstruction: '당신은 친근한 코딩 멘토입니다. 비유를 사용하여 설명하세요.',
});
```

**활용 사례:**
- 모델의 성격과 톤 가이드
- 출력 형식 요구사항 적용
- 역할 기반 어시스턴트 생성 (튜터, 기술 작가 등)
- 대화 전반에 걸친 일관된 동작 유지

### 6. Function Calling / Tool Use (v0.5.0+)

모델이 구조화된 매개변수로 외부 함수를 호출할 수 있게 합니다:

```typescript
import type { FunctionDeclaration } from 'gemback';

// 함수 정의
const weatherFunction: FunctionDeclaration = {
  name: 'get_current_weather',
  description: '특정 위치의 현재 날씨를 가져옵니다',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: '도시 이름 (예: 서울, 부산)',
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
      },
    },
    required: ['location'],
  },
};

// 함수 사용
const response = await client.generate("도쿄의 날씨는 어때요?", {
  tools: [weatherFunction],
  toolConfig: {
    functionCallingMode: 'auto', // 'auto' | 'any' | 'none'
  },
});

// 모델이 함수를 호출했는지 확인
if (response.functionCalls && response.functionCalls.length > 0) {
  response.functionCalls.forEach((call) => {
    console.log('함수:', call.name);
    console.log('인자:', call.args);

    // 실제 함수 실행
    const result = getCurrentWeather(call.args.location, call.args.unit);
    console.log('결과:', result);
  });
}
```

**함수 호출 모드:**
- `auto`: 모델이 함수 호출 시점 결정 (기본값)
- `any`: 모델이 최소 하나의 함수를 호출하도록 강제
- `none`: 함수 호출 비활성화

**고급 기능:**
```typescript
// 특정 함수만 제한
const response = await client.generate(prompt, {
  tools: [weatherFunction, calculatorFunction, databaseFunction],
  toolConfig: {
    functionCallingMode: 'any',
    allowedFunctionNames: ['get_current_weather'], // 날씨 함수만 허용
  },
});

// 함수 결과를 포함한 멀티턴 대화
const followUpResponse = await client.generateContent([
  { role: 'user', parts: [{ text: "날씨는 어때요?" }] },
  { role: 'model', parts: [{ functionCall: { name: 'get_current_weather', args: {...} } }] },
  { role: 'user', parts: [{ functionResponse: { name: 'get_current_weather', response: {...} } }] },
  { role: 'user', parts: [{ text: '우산을 가져가야 할까요?' }] },
]);
```

**활용 사례:**
- 외부 API 및 데이터베이스 통합
- 계산 및 데이터 처리 수행
- 실시간 정보 접근
- 구조화된 워크플로우 및 자동화 생성
- 도구 접근 권한이 있는 AI 에이전트 구축

### 7. Safety Settings (v0.5.0+)

다양한 유해 카테고리에 대한 콘텐츠 필터링 및 안전 임계값을 설정합니다:

```typescript
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

// 기본 안전 설정
const response = await client.generate('콘텐츠 검열에 대해 알려주세요', {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// 어린이 콘텐츠를 위한 엄격한 필터링
const childContent = await client.generate('아이들을 위한 이야기를 들려주세요', {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
  ],
});

// 다른 옵션과 결합
const response3 = await client.generate('교육용 기사를 작성하세요', {
  systemInstruction: '당신은 교육 콘텐츠 작가입니다.',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
  temperature: 0.7,
});
```

**사용 가능한 유해 카테고리:**
- `HARM_CATEGORY_HARASSMENT` (괴롭힘)
- `HARM_CATEGORY_HATE_SPEECH` (혐오 발언)
- `HARM_CATEGORY_SEXUALLY_EXPLICIT` (성적 콘텐츠)
- `HARM_CATEGORY_DANGEROUS_CONTENT` (위험 콘텐츠)

**차단 임계값:**
- `BLOCK_NONE`: 차단 안 함
- `BLOCK_ONLY_HIGH`: 높은 심각도 콘텐츠만 차단
- `BLOCK_MEDIUM_AND_ABOVE`: 중간 및 높은 심각도 차단 (권장)
- `BLOCK_LOW_AND_ABOVE`: 낮은, 중간, 높은 심각도 모두 차단 (가장 엄격)

**활용 사례:**
- 어린이에게 안전한 콘텐츠 생성
- 콘텐츠 정책 준수
- 브랜드에 적합한 응답
- 교육용 콘텐츠 필터링

### 8. JSON Mode (v0.5.0+)

스키마 검증을 통한 구조화된 JSON 응답 받기:

```typescript
import type { ResponseSchema } from 'gemback';

// 기본 JSON 모드
const response = await client.generate('이름, 나이, 이메일이 포함된 사용자 프로필을 생성하세요', {
  responseMimeType: 'application/json',
});

console.log(response.json); // 자동 파싱된 JSON 객체
// { name: "홍길동", age: 25, email: "hong@example.com" }

// 스키마로 JSON 구조 정의
const userSchema: ResponseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '사용자 이름' },
    age: { type: 'number', description: '사용자 나이' },
    email: { type: 'string', description: '이메일 주소' },
    address: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        country: { type: 'string' },
      },
    },
  },
  required: ['name', 'age', 'email'],
};

const response2 = await client.generate(
  '30대 한국인 사용자 프로필을 생성하세요',
  {
    responseMimeType: 'application/json',
    responseSchema: userSchema,
  }
);

// TypeScript 타입 안전성
interface User {
  name: string;
  age: number;
  email: string;
  address?: {
    city: string;
    country: string;
  };
}

const user = response2.json as User;
console.log(user.name, user.age, user.email);

// 배열 응답
const listSchema: ResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
  },
};

const todos = await client.generate('5개의 할 일 목록을 만들어주세요', {
  responseMimeType: 'application/json',
  responseSchema: listSchema,
});
```

**JSON Mode 기능:**
- ✅ **보장된 JSON**: 항상 유효한 JSON 출력
- ✅ **자동 파싱**: `response.json` 필드에서 자동 파싱된 객체 제공
- ✅ **스키마 검증**: OpenAPI 3.0 스타일 JSON Schema 지원
- ✅ **타입 안전성**: TypeScript 인터페이스와 원활하게 통합
- ✅ **복잡한 구조**: 중첩된 객체, 배열, 모든 JSON 타입 지원

**활용 사례:**
- API 응답 포맷팅
- 비구조화된 텍스트에서 데이터 추출
- 타입 안전한 API 통합
- 데이터베이스 레코드 생성
- 구조화된 콘텐츠 생성 (제품 목록, 설정 파일 등)

---

## 🔧 API 레퍼런스

### `GemBack`

#### Constructor Options

```typescript
interface GemBackOptions {
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
const client = new GemBack({
  apiKey: 'YOUR_KEY',

  // 사용할 모델만 지정
  fallbackOrder: [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
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

### v0.2.0 고급 설정

```typescript
const client = new GemBack({
  // 멀티 API 키 로테이션 (v0.2.0+)
  apiKeys: ['KEY_1', 'KEY_2', 'KEY_3'],
  apiKeyRotationStrategy: 'least-used',  // 또는 'round-robin'

  // 모니터링 & 추적 (v0.2.0+)
  enableMonitoring: true,                // 모니터링 활성화
  enableRateLimitPrediction: true,       // Rate limit 예측 경고

  // 기본 설정
  fallbackOrder: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  maxRetries: 2,
  timeout: 30000,
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

### 기본 로깅 (`debug: true`)

```
[GemBack] Attempting: gemini-2.5-flash
[GemBack] Failed (429 RPM Limit): gemini-2.5-flash
[GemBack] Fallback to: gemini-2.5-flash-lite
[GemBack] Retry attempt 1/2: gemini-2.5-flash-lite
[GemBack] Success: gemini-2.5-flash-lite (2nd attempt)
```

### 모니터링 활성화 시 (`enableMonitoring: true`)

```
[GemBack] Monitoring enabled: Rate limit tracking and health monitoring
[GemBack] Attempting: gemini-2.5-flash (API Key #1)
[GemBack] Rate limit warning for gemini-2.5-flash: 12/15 RPM
[GemBack] Success: gemini-2.5-flash (1234ms)
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

### Phase 2: Advanced Features ✅ (완료 - v0.2.0)

Phase 2에서는 프로덕션 환경에서의 안정성을 향상시키는 고급 기능들을 추가했습니다.

#### 🔐 멀티 API 키 지원 및 로테이션 ✅
- [x] **여러 API 키를 활용한 로드 밸런싱**
  - 자동 키 로테이션으로 RPM 제한 효과적으로 우회
  - round-robin 및 least-used 전략 지원
  - 키별 사용량 추적 및 통계 제공

#### 📊 모니터링 & 추적 ✅
- [x] **Rate Limiting 추적 및 예측**
  - 각 모델별 사용량 실시간 추적
  - RPM 제한 도달 예측 및 사전 경고 (80%, 90% 임계값)
  - 슬라이딩 윈도우 기반 사용 패턴 분석 (1분, 5분)

- [x] **Health Check 및 모델 상태 모니터링**
  - 모델별 상태 체크 (응답 시간, 성공률, 가용성)
  - 실시간 모델 Health 상태 (healthy/degraded/unhealthy)
  - Percentile 기반 성능 메트릭 (p50, p95, p99)
  - 연속 실패 감지 및 추적

**Phase 2 주요 성과:**
- ✅ 165개의 포괄적인 테스트 (Phase 1 대비 65% 증가)
- ✅ 프로덕션 레벨 모니터링 시스템
- ✅ RPM 제한 회피를 위한 멀티 키 로테이션
- ✅ 실시간 모델 Health 추적

### Phase 2.5: Advanced Content Generation ✅ (완료 - v0.5.0)

Phase 2.5에서는 Google GenAI SDK의 고급 콘텐츠 생성 기능을 완벽하게 지원하여, 프로덕션 환경에서 안전하고 구조화된 AI 콘텐츠 생성을 가능하게 했습니다.

#### 🎯 Function Calling / Tool Use ✅
- [x] **AI가 외부 함수를 호출할 수 있는 Tool Use 지원**
  - JSON Schema 기반 함수 정의
  - 3가지 호출 모드: `auto`, `any`, `none`
  - 특정 함수만 허용하는 `allowedFunctionNames` 옵션
  - 멀티턴 대화에서 함수 결과 반환 지원
  - 모든 생성 메서드에서 동작 (`generate`, `generateStream`, `generateContent`)

#### 📝 System Instructions ✅
- [x] **모델의 동작, 톤, 출력 형식 제어**
  - 문자열 및 구조화된 `Content` 형식 지원
  - 모든 생성 메서드에 적용
  - Fallback 시에도 명령어 유지
  - 다른 옵션과 자유롭게 조합

#### 🛡️ Safety Settings ✅
- [x] **프로덕션 준수 콘텐츠 안전 제어**
  - 4가지 유해 카테고리 지원 (괴롭힘, 혐오 발언, 성적 콘텐츠, 위험 콘텐츠)
  - 4단계 차단 임계값 (없음, 높음만, 중간 이상, 낮음 이상)
  - 안전 차단 시 자동 Fallback
  - 여러 설정 조합 가능

#### 🎨 JSON Mode (Structured Outputs) ✅
- [x] **신뢰할 수 있는 구조화된 데이터 추출**
  - `responseMimeType: 'application/json'`으로 JSON 모드 활성화
  - OpenAPI 3.0 스타일 JSON Schema 검증
  - 자동 JSON 파싱 (`response.json` 필드)
  - 객체, 배열, 중첩 구조 지원
  - TypeScript 인터페이스와 타입 안전하게 통합

**Phase 2.5 주요 성과:**
- ✅ 235개의 포괄적인 테스트 (Phase 2 대비 42% 증가)
- ✅ 4가지 주요 기능 추가 (Function Calling, System Instructions, Safety Settings, JSON Mode)
- ✅ ESLint 완전 클린 (20 에러 → 0 에러)
- ✅ TypeScript strict mode 100% 준수
- ✅ 프로덕션급 콘텐츠 생성 지원

### Phase 3: Performance & Ecosystem (향후 계획)

Phase 3에서는 성능 최적화와 생태계 확장에 집중할 예정입니다.

#### ⚡ 성능 최적화
- [ ] **응답 캐싱 (중복 요청 최적화)**
  - 동일 요청에 대한 캐싱으로 API 호출 절감
  - TTL 기반 캐시 만료 관리
  - 메모리 효율적인 캐시 전략

- [ ] **Connection Pooling**
  - HTTP 연결 재사용으로 성능 향상
  - 동시 요청 처리 최적화
  - 리소스 사용 효율화

#### 🛡️ 고급 안정성 패턴
- [ ] **Circuit Breaker 패턴**
  - 지속적 실패 시 일시적 차단
  - 자동 복구 및 재시도
  - 시스템 과부하 방지

#### 🌐 생태계 확장
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
