# 🎉 Release Notes - gemback v0.1.0

**릴리스 날짜**: 2025-11-22
**패키지 이름**: `gemback`
**NPM**: https://www.npmjs.com/package/gemback
**Repository**: https://github.com/Laeyoung/gem-back

---

## 📦 첫 번째 공식 릴리스!

**gemback v0.1.0**은 Google Gemini API의 RPM(분당 요청 수) 제한 문제를 자동으로 해결하는 스마트 Fallback 라이브러리의 첫 번째 안정 버전입니다.

---

## ✨ 주요 기능

### 🔄 자동 Fallback 시스템
- **4개 Gemini 모델 지원**
  - `gemini-2.5-flash` (최신, 최고 성능)
  - `gemini-2.5-flash-lite` (경량 버전)
  - `gemini-2.0-flash` (안정 버전)
  - `gemini-2.0-flash-lite` (경량 안정 버전)
- 한 모델이 RPM 제한에 걸리면 자동으로 다음 모델로 전환
- 커스터마이징 가능한 Fallback 순서

### 🔁 스마트 재시도 메커니즘
- **Exponential Backoff** 전략으로 일시적 오류 처리
- 재시도 가능/불가 에러 자동 판별
- 설정 가능한 최대 재시도 횟수 및 대기 시간

### 📡 실시간 스트리밍
- `generateStream()` 메서드로 실시간 응답 스트리밍 지원
- 긴 텍스트 생성 시 청크 단위로 결과 수신

### 💬 대화형 인터페이스
- `chat()` 메서드로 멀티턴 대화 지원
- 컨텍스트를 유지하며 연속적인 대화 가능

### 📊 통계 및 모니터링
- 모델별 사용률 추적
- Fallback 성공률 통계
- 전체 요청 수 및 성공률 모니터링

### 🛡️ 강력한 에러 처리
- 커스텀 `GeminiBackError` 타입으로 상세한 에러 정보 제공
- 모든 시도 내역 및 실패 원인 추적
- 5단계 로그 레벨 (debug/info/warn/error/silent)

### 🎯 TypeScript 완벽 지원
- 100% TypeScript로 작성
- 모든 타입 정의 포함 (.d.ts)
- IDE 자동완성 지원

### 📦 이중 모듈 지원
- **CommonJS** (require) 지원
- **ESM** (import) 지원
- Node.js 18.0.0 이상 호환

---

## 🚀 설치

```bash
npm install gemback
# 또는
yarn add gemback
# 또는
pnpm add gemback
```

---

## 💡 빠른 시작

### 기본 사용법
```typescript
import { GeminiBackClient } from 'gemback';

const client = new GeminiBackClient({
  apiKey: process.env.GEMINI_API_KEY
});

const response = await client.generate('안녕하세요, Gemini!');
console.log(response.text);
```

### 스트리밍
```typescript
const stream = await client.generateStream('긴 이야기를 들려주세요');

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### 대화
```typescript
const response = await client.chat([
  { role: 'user', content: '안녕하세요' },
  { role: 'assistant', content: '안녕하세요! 무엇을 도와드릴까요?' },
  { role: 'user', content: 'TypeScript에 대해 알려주세요' }
]);
```

---

## 📋 v0.1.0에 포함된 내용

### 핵심 기능
- ✅ GeminiClient - 단일 모델 API 호출
- ✅ FallbackClient - 다중 모델 Fallback 로직
- ✅ 자동 재시도 with Exponential Backoff
- ✅ 스트리밍 응답 (`generateStream`)
- ✅ 대화형 인터페이스 (`chat`)
- ✅ Fallback 통계 추적 (`getFallbackStats`)

### 에러 처리
- ✅ 커스텀 `GeminiBackError` 클래스
- ✅ RPM 제한 (429) 자동 감지 및 Fallback
- ✅ 인증 에러 즉시 실패 처리
- ✅ 모든 시도 내역 추적

### 유틸리티
- ✅ 5단계 로깅 시스템
- ✅ 타임아웃 설정
- ✅ 디버그 모드

### 테스트 및 품질
- ✅ **총 66개 테스트** 작성 및 통과
- ✅ Unit tests (client, fallback, retry, error, logger)
- ✅ Integration tests (fallback-flow)
- ✅ Mock API 구현
- ✅ 높은 테스트 커버리지

### 문서화
- ✅ 포괄적인 README.md
- ✅ API 레퍼런스
- ✅ 5개 예제 코드
- ✅ CHANGELOG.md
- ✅ CONTRIBUTING.md
- ✅ PUBLISH.md (배포 가이드)

### 개발 도구
- ✅ TypeScript 5.3+
- ✅ ESLint + Prettier
- ✅ Vitest (테스트 프레임워크)
- ✅ tsup (빌드 도구)

---

## 🔧 기술 스택

| 카테고리 | 기술 |
|---------|------|
| **언어** | TypeScript 5.3+ |
| **런타임** | Node.js 18.0+ |
| **빌드** | tsup (CommonJS + ESM) |
| **테스트** | Vitest |
| **린팅** | ESLint + Prettier |
| **API** | @google/generative-ai ^0.21.0 |

---

## 📊 통계

- **총 코드 라인 수**: ~2,000 라인
- **테스트 수**: 66개
- **지원 모델**: 4개
- **지원 Node 버전**: 18.0.0+
- **라이선스**: MIT

---

## 🗺️ 향후 계획

### Phase 2: Advanced Features (계획 중)
- [ ] Rate Limiting 추적 및 예측
- [ ] 응답 캐싱 (중복 요청 최적화)
- [ ] 멀티 API 키 지원 및 로테이션
- [ ] Circuit Breaker 패턴
- [ ] Health Check 및 모델 상태 모니터링
- [ ] Connection Pooling

### Phase 3: Ecosystem (향후 계획)
- [ ] CLI 도구
- [ ] 웹 대시보드 (실시간 모니터링)
- [ ] 모니터링 통합 (Prometheus, Grafana)
- [ ] 추가 AI 모델 지원 (Claude, GPT 등)

---

## 🙏 감사의 말

이 라이브러리는 Gemini API를 사용하는 개발자들이 RPM 제한 문제를 쉽게 해결할 수 있도록 만들어졌습니다. 첫 번째 릴리스를 성공적으로 배포하게 되어 매우 기쁩니다!

버그 리포트, 기능 제안, Pull Request는 언제나 환영합니다.

---

## 🔗 링크

- **NPM 패키지**: https://www.npmjs.com/package/gemback
- **GitHub 저장소**: https://github.com/Laeyoung/gem-back
- **이슈 트래커**: https://github.com/Laeyoung/gem-back/issues
- **문서**: https://github.com/Laeyoung/gem-back#readme
- **Gemini API 문서**: https://ai.google.dev/docs

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포할 수 있습니다.

---

**Made with ❤️ by Laeyoung**

*gemback v0.1.0 - Smart Gemini API Fallback for Everyone!*
