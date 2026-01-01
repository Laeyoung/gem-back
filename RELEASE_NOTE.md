# 🎉 Release Notes - gemback v0.5.0

**릴리스 날짜**: 2026-01-01
**패키지 이름**: `gemback`
**NPM**: https://www.npmjs.com/package/gemback
**Repository**: https://github.com/Laeyoung/gem-back

---

## 📦 v0.5.0 - Production-Grade Content Generation

**gemback v0.5.0**은 Google GenAI SDK의 고급 기능을 완벽 지원하는 메이저 업데이트입니다. Function Calling, System Instructions, Safety Settings, JSON Mode 등 4가지 핵심 기능을 추가하여 프로덕션 환경에서 안전하고 구조화된 AI 콘텐츠 생성이 가능합니다.

---

## ✨ 주요 신규 기능

### 🎯 1. Function Calling / Tool Use

AI가 외부 함수를 호출할 수 있는 Tool Use 기능을 지원합니다.

**핵심 기능:**
- JSON Schema 기반 함수 정의
- 3가지 호출 모드: `auto`, `any`, `none`
- 특정 함수만 허용하는 `allowedFunctionNames` 옵션
- 멀티턴 대화에서 함수 결과 반환 지원
- 모든 생성 메서드에서 동작 (`generate`, `generateStream`, `generateContent`)

**사용 예시:**
```typescript
import type { FunctionDeclaration } from 'gemback';

const weatherFunction: FunctionDeclaration = {
  name: 'get_current_weather',
  description: 'Get the current weather in a given location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'The city name' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
    },
    required: ['location']
  }
};

const response = await client.generate("What's the weather in Tokyo?", {
  tools: [weatherFunction],
  toolConfig: { functionCallingMode: 'auto' }
});

if (response.functionCalls) {
  // AI가 함수를 호출했습니다
  console.log(response.functionCalls[0].name);  // 'get_current_weather'
  console.log(response.functionCalls[0].args);  // { location: 'Tokyo', unit: 'celsius' }
}
```

**활용 사례:**
- AI 에이전트 및 워크플로우 구축
- 외부 API 통합 (날씨, 주식, 데이터베이스 등)
- 실시간 정보 제공
- 계산 및 데이터 처리

---

### 📝 2. System Instructions

모델의 동작, 톤, 출력 형식을 제어하는 시스템 명령어를 지원합니다.

**핵심 기능:**
- 문자열 또는 구조화된 `Content` 형식 지원
- 모든 생성 메서드에 적용
- Fallback 시에도 명령어 유지
- 다른 옵션과 자유롭게 조합

**사용 예시:**
```typescript
// 간단한 문자열 형식
const response = await client.generate('Explain TypeScript', {
  systemInstruction: 'You are a helpful programming tutor. Explain concepts clearly for beginners.'
});

// 구조화된 형식
const response2 = await client.generate('What is async/await?', {
  systemInstruction: {
    role: 'user',
    parts: [{ text: 'You are a senior engineer. Provide technical, detailed explanations.' }]
  }
});
```

**활용 사례:**
- 역할 기반 어시스턴트 (튜터, 기술 작가, 멘토 등)
- 출력 형식 지정 (마크다운, 불릿 포인트 등)
- 일관된 톤 및 스타일 유지
- 행동 제약 설정

---

### 🛡️ 3. Safety Settings

콘텐츠 안전 및 필터링 설정을 지원합니다.

**핵심 기능:**
- 4가지 유해 카테고리 지원 (괴롭힘, 혐오 발언, 성적 콘텐츠, 위험 콘텐츠)
- 4단계 차단 임계값 (없음, 높음만, 중간 이상, 낮음 이상)
- 안전 차단 시 자동 Fallback
- 여러 설정 조합 가능

**사용 예시:**
```typescript
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

// 기본 안전 설정
const response = await client.generate('Tell a story for kids', {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE  // 엄격한 필터링
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
    }
  ]
});
```

**활용 사례:**
- 어린이용 안전한 콘텐츠 생성
- 콘텐츠 정책 준수
- 브랜드에 적합한 응답 보장
- 교육용 콘텐츠 필터링

---

### 🎨 4. JSON Mode (Structured Outputs)

구조화된 JSON 응답을 보장하는 JSON 모드를 지원합니다.

**핵심 기능:**
- `responseMimeType: 'application/json'`으로 JSON 모드 활성화
- OpenAPI 3.0 스타일 JSON Schema 검증
- 자동 JSON 파싱 (`response.json` 필드)
- 객체, 배열, 중첩 구조 지원
- TypeScript 인터페이스와 타입 안전하게 통합

**사용 예시:**
```typescript
import type { ResponseSchema } from 'gemback';

// 스키마 정의
const userSchema: ResponseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string' }
  },
  required: ['name', 'age', 'email']
};

// JSON 모드로 생성
const response = await client.generate('Generate a user profile', {
  responseMimeType: 'application/json',
  responseSchema: userSchema
});

// 타입 안전하게 사용
interface User {
  name: string;
  age: number;
  email: string;
}

const user = response.json as User;
console.log(user.name, user.age, user.email);
```

**활용 사례:**
- API 응답 포맷팅
- 비구조화된 텍스트에서 데이터 추출
- 타입 안전한 API 통합
- 데이터베이스 레코드 생성
- 구조화된 콘텐츠 생성

---

## 🔧 코드 품질 개선

### TypeScript 타입 안전성 강화

**개선 사항:**
- `hasFunctionCall()` 타입 가드 추가로 런타임/컴파일타임 안전성 확보
- `ErrorResponse` 인터페이스 정의로 에러 처리 개선
- 모든 `any` 타입 제거 및 명시적 타입 사용
- Optional chaining으로 안전한 속성 접근

**ESLint 완전 클린:**
- 20개 에러 → 0개 에러
- `@typescript-eslint/no-explicit-any` 경고 제거
- Unsafe member access 및 assignment 제거
- Strict TypeScript 규칙 100% 준수

---

## 📊 테스트 & 검증

### 포괄적인 테스트 커버리지

**테스트 현황:**
- ✅ **235 tests** passing (Phase 2 대비 42% 증가)
- ✅ **17 test files** with comprehensive scenarios
- ✅ 모든 신규 기능 테스트 완료:
  - `tests/unit/function-calling.test.ts` - 19 tests
  - `tests/unit/system-instructions.test.ts` - 11 tests
  - `tests/unit/safety-settings.test.ts` - 10 tests
  - `tests/unit/json-mode.test.ts` - 15 tests
- ✅ Fallback 동작 검증
- ✅ 엣지 케이스 및 에러 시나리오 테스트

---

## 📋 마이그레이션 가이드

### v0.5.0으로 업데이트

```bash
npm install gemback@0.5.0
# 또는
yarn upgrade gemback@0.5.0
# 또는
pnpm update gemback@0.5.0
```

### 주의사항 (Breaking Changes 없음)

이번 업데이트는 **완전한 하위 호환성**을 보장합니다. 기존 코드를 수정할 필요가 없습니다.

**신규 기능은 모두 선택적(Optional):**
- `systemInstruction` - 기존처럼 생략 가능
- `tools` / `toolConfig` - 필요한 경우에만 사용
- `safetySettings` - 기본 안전 설정 유지
- `responseMimeType` / `responseSchema` - 일반 텍스트 응답이 기본값

### 권장 사항

프로덕션 환경에서 다음 기능 활용을 권장합니다:

1. **System Instructions**: 일관된 AI 동작을 위해 역할 정의
2. **Safety Settings**: 콘텐츠 정책 준수 및 브랜드 안전성
3. **JSON Mode**: API 통합 및 구조화된 데이터 추출
4. **Function Calling**: 외부 시스템 통합 및 AI 에이전트 구축

---

## 🎯 주요 사용 사례 및 예제

### 1. AI 에이전트 구축

```typescript
// 날씨 조회 + 여행 추천 에이전트
const response = await client.generate(
  "I'm traveling to Tokyo next week. What should I prepare?",
  {
    systemInstruction: 'You are a helpful travel assistant.',
    tools: [weatherFunction, flightFunction, hotelFunction],
    toolConfig: { functionCallingMode: 'auto' }
  }
);
```

### 2. 안전한 콘텐츠 생성

```typescript
// 어린이용 교육 콘텐츠
const story = await client.generate('Tell an educational story about science', {
  systemInstruction: 'You are a children\'s education content writer.',
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }
  ]
});
```

### 3. 구조화된 데이터 추출

```typescript
// 이메일에서 연락처 정보 추출
const contactSchema: ResponseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    company: { type: 'string' }
  }
};

const extracted = await client.generate(emailText, {
  systemInstruction: 'Extract contact information from the email.',
  responseMimeType: 'application/json',
  responseSchema: contactSchema
});

const contact = extracted.json as ContactInfo;
```

---

## 🔗 링크

- **NPM 패키지**: https://www.npmjs.com/package/gemback
- **GitHub 저장소**: https://github.com/Laeyoung/gem-back
- **전체 CHANGELOG**: [CHANGELOG.md](./CHANGELOG.md)
- **문서**: [README.md](./README.md)
- **예제**: [examples/](./examples/)
  - `function-calling.ts` - Function Calling 예제
  - `system-instructions.ts` - System Instructions 예제
  - `safety-settings.ts` - Safety Settings 예제
  - `json-mode.ts` - JSON Mode 예제

---

## 🙏 감사의 말

gemback을 사용해주시는 모든 분들께 감사드립니다. v0.5.0은 프로덕션 환경에서 안전하고 구조화된 AI 콘텐츠 생성을 가능하게 하는 중요한 릴리스입니다.

피드백과 기여는 언제나 환영합니다!

---

**Made with ❤️ by Laeyoung**
