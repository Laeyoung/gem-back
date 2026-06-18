# 💎 Gem Back

> Smart Gemini API Fallback Library with Multi-Key Rotation & Monitoring

[![npm version](https://badge.fury.io/js/gemback.svg)](https://www.npmjs.com/package/gemback)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-248%20passing-brightgreen.svg)](https://github.com/Laeyoung/gem-back)

**Gem Back**은 Google Gemini API의 RPM(Requests Per Minute) 제한을 자동으로 처리하는 Fallback 시스템과 프로덕션급 모니터링 기능을 제공하는 NPM 라이브러리입니다.

**[English](./README.md)** | **[예제](./examples)** | **[Changelog](./CHANGELOG.md)**

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
- ✅ **완전한 테스트**: 248개 테스트로 검증된 안정성
- ✅ **모니터링 & 추적**: Rate limiting 예측 및 모델 Health 모니터링

---

## 🚀 지원 모델

Gem Back은 Gemini 모델 전반에 걸친 자동 Fallback을 지원합니다:

**기본 Fallback 체인** (무료 티어 최적화 — v0.7.0, RPD 우선):
1. `gemini-3.1-flash-lite` — stable, 500 RPD (일일 쿼터 최대)
2. `gemini-3.5-flash` — 최신, 최고 품질 (20 RPD)
3. `gemini-3-flash-preview` — 백업 (20 RPD) ⚠️

일일 처리량보다 출력 품질이 더 중요하다면, `gemini-3.5-flash`를 앞에 둔 `fallbackOrder`를 명시적으로 전달하세요.

**무료 티어 쿼터 스냅샷** (2026-05-28):

| 모델 | RPM | TPM | RPD | 비고 |
|---|---|---|---|---|
| `gemini-3.1-flash-lite` | 15 | 250K | 500 | |
| `gemini-2.5-flash-lite` | 10 | 250K | 20 | ⚠️ deprecated (2026-07-22 종료 → `gemini-3.1-flash-lite`) |
| `gemini-3.5-flash` | 5 | 250K | 20 | |
| `gemini-3-flash-preview` | 5 | 250K | 20 | ⚠️ preview |
| `gemini-2.5-flash` | 5 | 250K | 20 | ⚠️ deprecated (2026-06-17 종료 → `gemini-3.1-flash-lite`) |

**유료 전용 모델** (`ALL_MODELS`에는 포함되지만, 무료 티어 키로 사용 시 런타임 경고):
- `gemini-3.1-pro-preview`
- `gemini-2.5-pro`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`

**Deprecation 경고** (v0.6.0+): 종료 예정 모델은 자동으로 추적됩니다. `logLevel: 'warn'`을 설정하면 deprecation 경고를 확인할 수 있으며, `DEPRECATED_MODELS` export를 통해 프로그래밍적으로 접근할 수도 있습니다.

```typescript
import { DEPRECATED_MODELS } from 'gemback';

// 어떤 모델이 deprecated인지 확인
DEPRECATED_MODELS.forEach(({ model, shutdownDate, replacement }) => {
  console.log(`${model} → ${replacement} (${shutdownDate}까지)`);
});
```

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

## 🔄 v0.6 → v0.7 마이그레이션

v0.7.0에는 항상 적용되는 breaking change 하나와 조건부 변경 하나가 포함되어 있습니다. 대부분의 호출부는 수정이 필요 없습니다.

### 확정된 breaking change

- **`DeprecatedModelInfo.reason`이 자유 형식 `string`에서 문자열 리터럴 union으로 변경**되었습니다 (`'replaced_by_newer' | 'removed_from_api' | 'tier_change'`). `reason`을 읽고 있다면 union 타입으로 전환하세요. 기존 항목의 산문형 설명 문자열은 새로운 선택적 `notes: string` 필드로 이동되었습니다.

  ```ts
  // 이전 (v0.6)
  const reason: string = info.reason; // 예: "Gemini 2.0 series end of life"

  // 이후 (v0.7)
  const reason: DeprecationReason = info.reason; // 'replaced_by_newer' | ...
  const detail: string | undefined = info.notes; // 원본 산문형 설명 (있는 경우)
  ```

### 기본 Fallback 순서 변경

`GemBack`에 `fallbackOrder`를 전달하지 않았다면, 기본 순서가 이제 모델 품질이 아닌 일일 RPD에 최적화됩니다:

```
gemini-3.1-flash-lite → gemini-3.5-flash → gemini-3-flash-preview
```

v0.6의 품질 우선 동작을 유지하려면 명시적으로 전달하세요:

```ts
new GemBack({
  apiKey: process.env.GEMINI_API_KEY,
  fallbackOrder: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'],
});
```

### 새롭게 도입한 유틸리티

- `REMOVED_MODELS`와 `DEPRECATED_MODELS` export는 무엇이 제거/대체되었는지에 대한 단일 진실 공급원(single source of truth)입니다.
- `RateLimitStatus.currentTPM` / `maxTPM` / `tpmUtilizationPercent`이 이제 무료 티어 모델에 대해 채워집니다.
- `gemini-3.5-flash`와 stable `gemini-3.1-flash-lite`를 사용할 수 있습니다.

### 무료 티어 키에서의 유료 전용 모델

무료 티어 API 키로 `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3.1-pro-preview`를 호출하면, 예상되는 4xx를 설명하는 일회성 `logger.warn`이 출력됩니다. 키를 업그레이드하거나 `fallbackOrder`를 무료 티어 모델로 고정하세요.

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
// 자동으로 최적의 모델을 선택하여 Fallback 처리
```

### 커스텀 Fallback 순서

```typescript
const client = new GemBack({
  apiKey: process.env.GEMINI_API_KEY,
  fallbackOrder: [
    'gemini-3.5-flash',       // 선택: 품질이 일일 처리량보다 중요하면 최고 품질 모델을 먼저
    'gemini-3.1-flash-lite',  // stable, 무료 티어 RPD 최대 (500/일)
    'gemini-3-flash-preview', // 최후 백업
  ],
  maxRetries: 3,
  timeout: 30000,
  debug: true, // 상세 로그 출력
});
```

### 스트리밍 응답

```typescript
const stream = client.generateStream('긴 이야기를 들려주세요');

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
// 모델이 RPM 제한에 걸리면 자동으로 Fallback 체인을 따라 다음 모델로 전환
// (v0.7.0 기본값: gemini-3.1-flash-lite → gemini-3.5-flash → gemini-3-flash-preview)
const response = await client.generate('복잡한 질문');
```

### 2. 재시도 로직

```typescript
const client = new GemBack({
  apiKey: 'YOUR_KEY',
  maxRetries: 3, // 각 모델당 최대 재시도 횟수
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
//     'gemini-3-flash-preview': 70,
//     'gemini-2.5-flash': 30
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
        description: '도시 이름 (예: Tokyo, London)',
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

console.log(response.json);  // 파싱된 JSON 객체
console.log(response.text);  // 원본 JSON 문자열

// 스키마 검증을 사용한 JSON 모드
const userSchema: ResponseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string' },
  },
  required: ['name', 'age', 'email'],
};

const response2 = await client.generate('사용자 프로필을 생성하세요', {
  responseMimeType: 'application/json',
  responseSchema: userSchema,
});

// 타입 안전한 사용
interface User {
  name: string;
  age: number;
  email: string;
}

const user = response2.json as User;
console.log(user.name, user.age, user.email);

// 객체 배열
const productsSchema: ResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      price: { type: 'number' },
    },
    required: ['id', 'name', 'price'],
  },
};

const products = await client.generate('제품 3개를 생성하세요', {
  responseMimeType: 'application/json',
  responseSchema: productsSchema,
});

// 복잡한 중첩 구조
const blogPostSchema: ResponseSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    author: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'author'],
};
```

**지원하는 스키마 타입:**
- `object`: 정의된 속성을 가진 객체
- `array`: 항목들의 배열
- `string`, `number`, `boolean`, `null`: 원시 타입

**활용 사례:**
- API 응답 포맷팅
- 데이터 추출 및 구조화
- 타입 안전한 API 통합
- 구조화된 콘텐츠 생성
- 데이터베이스 저장용 출력

---

## 🔧 API 레퍼런스

### `GemBack`

#### Constructor Options

```typescript
import type { GeminiModel, RateLimitConfig } from 'gemback';

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
  customRateLimits?: Partial<Record<GeminiModel, Partial<RateLimitConfig>>>; // 선택: 모델별
                                     // RPM/TPM/RPD 오버라이드. FREE_TIER_LIMITS 기본값 위에
                                     // 적용됩니다. 항목별 필드 병합이므로
                                     // { 'gemini-2.5-flash': { rpm: 10 } }는 기존
                                     // tpm/rpd를 유지합니다. `enableMonitoring: true`일 때만 사용됩니다.
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
  maxTokens: 1000,
  systemInstruction: 'You are a helpful assistant',  // v0.5.0+
  tools: [weatherFunction],  // v0.5.0+
  toolConfig: { functionCallingMode: 'auto' },  // v0.5.0+
  safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }],  // v0.5.0+
  responseMimeType: 'application/json',  // v0.5.0+
  responseSchema: { type: 'object', properties: { ... } }  // v0.5.0+
});
```

**GenerateOptions:**
```typescript
interface GenerateOptions {
  model?: GeminiModel;
  temperature?: number;           // 0.0 - 2.0
  maxTokens?: number;            // 최대 출력 토큰 수
  topP?: number;                 // 0.0 - 1.0
  topK?: number;                 // Top-K 샘플링
  systemInstruction?: string | Content;  // v0.5.0+: 모델 동작 제어
  tools?: FunctionDeclaration[];         // v0.5.0+: 사용 가능한 함수
  toolConfig?: ToolConfig;               // v0.5.0+: 함수 호출 설정
  safetySettings?: SafetySetting[];      // v0.5.0+: 콘텐츠 필터링
  responseMimeType?: string;             // v0.5.0+: 응답 형식 (예: 'application/json')
  responseSchema?: ResponseSchema;       // v0.5.0+: JSON 스키마 검증
}

interface ToolConfig {
  functionCallingMode?: 'auto' | 'any' | 'none';
  allowedFunctionNames?: string[];
}
```

##### `generateStream(prompt, options?)`

스트리밍 텍스트 생성

```typescript
const stream = client.generateStream('Tell me a story');
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
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
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
  fallbackOrder: ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview'],
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
[GemBack] Attempting: gemini-3-flash-preview
[GemBack] Failed (429 RPM Limit): gemini-3-flash-preview
[GemBack] Fallback to: gemini-2.5-flash
[GemBack] Retry attempt 1/2: gemini-2.5-flash
[GemBack] Success: gemini-2.5-flash (2nd attempt)
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

Phase 2.5에서는 Google GenAI SDK의 프로덕션급 콘텐츠 생성 기능(Function Calling, System Instructions, 안전 제어, 구조화된 출력)을 추가했습니다.

#### 🎯 System Instructions ✅
- [x] **모델의 동작 및 응답 스타일 제어**
  - 모델의 성격, 톤, 출력 형식 가이드
  - 문자열 및 구조화된 Content 형식 지원
  - 모든 생성 메서드에 명령어 적용
  - Fallback 체인 전반에 걸쳐 명령어 유지

#### 🔧 Function Calling (Tool Use) ✅
- [x] **AI가 외부 함수를 호출할 수 있도록 지원**
  - 구조화된 매개변수로 함수 정의 (JSON Schema)
  - 여러 함수 호출 모드: auto, any, none
  - allowedFunctionNames로 허용 함수 제한
  - 모델 응답에서 함수 호출 추출
  - 함수 결과를 포함한 멀티턴 대화 지원

#### 🛡️ Safety Settings ✅
- [x] **콘텐츠 필터링 및 검열**
  - 다양한 유해 카테고리에 대한 안전 임계값 설정
  - 괴롭힘, 혐오 발언, 성적 콘텐츠, 위험 콘텐츠 필터링 지원
  - 여러 차단 수준: none, low, medium, high
  - 어린이에게 안전한 콘텐츠 생성
  - 콘텐츠 정책 준수

#### 📊 JSON Mode ✅
- [x] **구조화된 JSON 응답**
  - `response.json` 필드를 통한 자동 JSON 파싱
  - OpenAPI 호환 스키마로 검증
  - 객체, 배열, 중첩 구조 지원
  - TypeScript 인터페이스와 타입 안전한 통합
  - 구조화된 데이터 추출 및 API 응답 포맷팅

**Phase 2.5 주요 성과:**
- ✅ 248개의 포괄적인 테스트
- ✅ 모든 고급 기능에 대한 완전한 GenAI SDK 호환성
- ✅ 프로덕션 준비 완료된 콘텐츠 안전 제어
- ✅ 스키마 검증을 통한 타입 안전 구조화 출력
- ✅ 모든 기능에 대한 종합 예제

### Phase 3: Performance & Ecosystem (향후 계획)

Phase 3에서는 성능 최적화와 생태계 확장에 집중할 예정입니다.

#### ⚡ 성능 최적화
- [ ] **응답 캐싱**
  - 캐싱으로 API 호출 절감
  - TTL 기반 캐시 만료
  - 메모리 효율적인 캐시 전략

- [ ] **Connection Pooling**
  - 연결 재사용으로 성능 향상
  - 동시 요청 처리 최적화
  - 효율적인 리소스 사용

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

<!-- PROJECTS_SHOWCASE_START -->
## 🌟 Gem Back을 사용하는 프로젝트

**Gem Back을 사용하는 프로젝트를 가장 먼저 소개해보세요!**

Gem Back을 프로젝트에서 사용하고 계신다면, 여기에 소개해 드리고 싶습니다.
여러분의 프로젝트가 첫 번째로 등록될 수 있습니다!

*업데이트: 2025-11-29*
<!-- PROJECTS_SHOWCASE_END -->

---

**Made with ❤️ by Laeyoung**
