# 🎉 Release Notes - gemback v0.2.1

**릴리스 날짜**: 2025-11-24
**패키지 이름**: `gemback`
**NPM**: https://www.npmjs.com/package/gemback
**Repository**: https://github.com/Laeyoung/gem-back

---

## 📦 v0.2.1 - Naming Consistency Update

**gemback v0.2.1**은 라이브러리 이름과의 일관성을 위해 클래스 및 타입 이름을 개선한 마이너 업데이트입니다.

---

## ✨ 주요 변경사항

### 🔄 이름 일관성 개선

#### 1. 클래스 이름 변경
**`GeminiBackClient` → `GemBack`**

```typescript
// 이전 (v0.2.0)
import { GeminiBackClient } from 'gemback';
const client = new GeminiBackClient({ apiKey: '...' });

// 변경 후 (v0.2.1)
import { GemBack } from 'gemback';
const client = new GemBack({ apiKey: '...' });
```

**변경 이유:**
- 라이브러리 이름 `gemback`과의 일관성 향상
- 더 간결하고 직관적인 클래스 이름
- 코드 가독성 개선

#### 2. 타입 이름 변경
**`GeminiBackClientOptions` → `GemBackOptions`**

```typescript
// 이전 (v0.2.0)
import { GeminiBackClientOptions } from 'gemback';
const options: GeminiBackClientOptions = {
  apiKey: process.env.GEMINI_API_KEY,
  fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash']
};

// 변경 후 (v0.2.1)
import { GemBackOptions } from 'gemback';
const options: GemBackOptions = {
  apiKey: process.env.GEMINI_API_KEY,
  fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash']
};
```

**변경 이유:**
- 클래스 이름과의 일관성
- 타입 이름의 간결성 향상
- 사용자 혼란 최소화

---

## 🔙 하위 호환성

기존 코드와의 호환성을 위해 **Deprecated 타입 alias**를 제공합니다:

```typescript
// src/types/config.ts
export interface GemBackOptions { /* ... */ }

// 하위 호환성을 위한 deprecated alias
export type GeminiBackClientOptions = GemBackOptions;
```

**이는 기존 v0.2.0 사용자가 점진적으로 마이그레이션할 수 있도록 합니다.**

---

## 📋 마이그레이션 가이드

### 권장 업데이트 방법

1. **클래스 이름 변경**
```typescript
// 모든 GeminiBackClient를 GemBack으로 교체
- import { GeminiBackClient } from 'gemback';
+ import { GemBack } from 'gemback';

- const client = new GeminiBackClient({ ... });
+ const client = new GemBack({ ... });
```

2. **타입 이름 변경** (선택사항이지만 권장)
```typescript
// 모든 GeminiBackClientOptions를 GemBackOptions로 교체
- import { GeminiBackClientOptions } from 'gemback';
+ import { GemBackOptions } from 'gemback';

- const options: GeminiBackClientOptions = { ... };
+ const options: GemBackOptions = { ... };
```

### 점진적 마이그레이션

Deprecated alias 덕분에 한 번에 모두 변경할 필요는 없습니다:

```typescript
// 이것도 여전히 작동합니다 (deprecated)
import { GemBack, GeminiBackClientOptions } from 'gemback';
const options: GeminiBackClientOptions = { apiKey: '...' };
const client = new GemBack(options); // ✅ 작동함
```

---

## 📝 업데이트된 파일

### 소스 코드 (6개)
- `src/types/config.ts` - 인터페이스 이름 변경 및 deprecated alias 추가
- `src/client/FallbackClient.ts` - 클래스 이름 및 타입 참조 변경
- `src/config/defaults.ts` - 타입 참조 변경
- `src/index.ts` - export 업데이트

### 문서 (27개)
- `README.md`, `README.ko.md`
- `CHANGELOG.md`
- 모든 예제 파일 (7개)
- 모든 테스트 파일
- 통합 테스트 파일들

---

## 🚀 업그레이드 방법

```bash
npm install gemback@0.2.1
# 또는
yarn upgrade gemback@0.2.1
# 또는
pnpm update gemback@0.2.1
```

---

## ⚠️ Breaking Changes

### 주의사항
- **클래스 이름이 변경됨**: `GeminiBackClient`를 직접 참조하는 코드는 업데이트 필요
- **타입 이름이 변경됨**: `GeminiBackClientOptions` 타입을 사용하는 코드는 업데이트 권장
- **Deprecated alias 제공**: 점진적 마이그레이션을 위해 이전 이름도 계속 사용 가능

### 영향 받는 코드
```typescript
// ❌ 업데이트 필요
new GeminiBackClient({ ... })

// ✅ 새로운 방식
new GemBack({ ... })

// ⚠️ Deprecated (작동하지만 업데이트 권장)
const options: GeminiBackClientOptions = { ... };

// ✅ 권장 방식
const options: GemBackOptions = { ... };
```

---

## 📊 v0.2.1 통계

- **변경된 파일**: 33개
- **커밋 수**: 2개
- **코드 변경**: 클래스/타입 이름 정리
- **하위 호환성**: Deprecated alias로 유지
- **테스트**: 모든 기존 테스트 통과 (165개)

---

## 🔗 v0.2.0에서 달라진 점

v0.2.1은 v0.2.0의 모든 기능을 그대로 유지하면서, 이름만 개선한 버전입니다:

- ✅ 멀티 API 키 로테이션 (v0.2.0 기능)
- ✅ Rate Limit 추적 및 예측 (v0.2.0 기능)
- ✅ Health 모니터링 (v0.2.0 기능)
- ✅ 모든 기존 기능 유지
- 🆕 **더 나은 이름으로 일관성 향상**

---

## 📖 전체 기능 목록

### 핵심 기능
- ✅ **GemBack** 클래스 (이전: GeminiBackClient)
- ✅ 4개 Gemini 모델 자동 Fallback
- ✅ 스마트 재시도 with Exponential Backoff
- ✅ 실시간 스트리밍 (`generateStream`)
- ✅ 대화형 인터페이스 (`chat`)
- ✅ 멀티 API 키 로테이션 (v0.2.0+)
- ✅ Rate Limit 추적 및 예측 (v0.2.0+)
- ✅ Health 모니터링 (v0.2.0+)

### 개발자 경험
- ✅ TypeScript 완벽 지원
- ✅ 이중 모듈 지원 (CommonJS + ESM)
- ✅ 포괄적인 문서 및 예제
- ✅ 165개 테스트로 검증된 안정성

---

## 🙏 감사의 말

사용자 피드백을 반영하여 더 나은 네이밍으로 개선했습니다. 앞으로도 gemback이 더 사용하기 쉽고 직관적인 라이브러리가 되도록 노력하겠습니다!

---

## 🔗 링크

- **NPM 패키지**: https://www.npmjs.com/package/gemback
- **GitHub 저장소**: https://github.com/Laeyoung/gem-back
- **이슈 트래커**: https://github.com/Laeyoung/gem-back/issues
- **전체 CHANGELOG**: [CHANGELOG.md](./CHANGELOG.md)
- **문서**: [README.md](./README.md)
- **Gemini API 문서**: https://ai.google.dev/docs

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포할 수 있습니다.

---

**Made with ❤️ by Laeyoung**

*gemback v0.2.1 - Cleaner Names, Better Experience!*
