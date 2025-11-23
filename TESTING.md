# v0.2.0 출시 전 테스트 가이드

## 🎯 목적

v0.2.0 출시 전 실제 유저 관점에서 라이브러리의 모든 기능을 검증합니다.

## 📦 테스트 환경

`test-integration/` 디렉토리에 실제 사용자가 npm에서 패키지를 설치하는 것과 동일한 환경을 구축했습니다:

- **CommonJS**: Node.js 기본 환경 (`require` 사용)
- **ESM**: 최신 JavaScript 모듈 시스템 (`import` 사용)
- **TypeScript**: 타입 안정성 및 IDE 지원 검증

## ⚡ 빠른 시작

### 1단계: 패키지 빌드

```bash
npm install
npm run build
npm pack
```

### 2단계: 통합 테스트 실행

```bash
cd test-integration
./run-all-tests.sh
```

### 3단계: 단위 테스트 실행

```bash
npm test
```

## 📝 테스트 종류

### 기본 구조 테스트 (API 키 불필요)

- ✅ 패키지 로딩 검증
- ✅ 클래스 및 메서드 존재 확인
- ✅ TypeScript 타입 정의 검증
- ✅ 모듈 시스템 호환성

### 전체 기능 테스트 (API 키 필요)

```bash
export GEMINI_API_KEY=your_api_key
cd test-integration
./run-all-tests.sh
```

테스트되는 기능:

#### Phase 1 (v0.1.0)
- Basic text generation
- Streaming responses
- Chat interface
- Automatic fallback
- Retry logic
- Statistics tracking

#### Phase 2 (v0.2.0)
- Multi-key rotation
- Rate limit tracking
- Health monitoring
- Predictive warnings

## 📚 상세 문서

- **[빠른 시작](./test-integration/QUICK_START.md)**: 5분 안에 테스트하기
- **[통합 테스트 가이드](./test-integration/README.md)**: 상세 테스트 방법
- **[테스트 시나리오](./test-integration/TEST_SCENARIOS.md)**: 모든 테스트 케이스

## ✅ 출시 전 체크리스트

- [ ] `npm run build` 성공
- [ ] `npm pack` 성공
- [ ] CommonJS 테스트 통과
- [ ] ESM 테스트 통과
- [ ] TypeScript 테스트 통과
- [ ] 단위 테스트 통과 (`npm test`)
- [ ] README.md 예제 검증
- [ ] 문서 업데이트 확인

## 🚀 출시 준비 완료 기준

모든 테스트가 통과하고 문서가 정확하면 **v0.2.0 출시 가능**합니다!

```bash
# 최종 검증
npm run build && npm pack
cd test-integration && ./run-all-tests.sh
cd .. && npm test
```

모두 통과하면 🎉 **Ready to publish!** 🎉
