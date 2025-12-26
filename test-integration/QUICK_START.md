# v0.4.0 출시 전 빠른 테스트 가이드

## ⚡ 5분 안에 테스트하기

### 1. 패키지 빌드 (프로젝트 루트에서)

```bash
npm install
npm run build
npm pack
```

**결과**: `gemback-0.4.0.tgz` 파일이 생성됩니다.

---

### 2. 자동 테스트 실행

```bash
cd test-integration
./run-all-tests.sh
```

이 명령어는 자동으로:
- ✅ CommonJS 환경 테스트
- ✅ ESM 환경 테스트
- ✅ TypeScript 환경 테스트

모두 실행합니다.

---

### 3. API 키로 전체 테스트 (선택사항)

```bash
export GEMINI_API_KEY=your_api_key_here
cd test-integration
./run-all-tests.sh
```

이제 실제 API 호출을 포함한 모든 기능이 테스트됩니다.

---

## 🎯 개별 환경 테스트

### CommonJS만 테스트

```bash
cd test-integration/commonjs-test
npm install
npm install ../../gemback-0.4.0.tgz
npm test
```

### ESM만 테스트

```bash
cd test-integration/esm-test
npm install
npm install ../../gemback-0.4.0.tgz
npm test
```

### TypeScript만 테스트

```bash
cd test-integration/typescript-test
npm install
npm install ../../gemback-0.4.0.tgz
npm test
```

---

## ✅ 성공 확인

모든 테스트가 다음과 같이 표시되면 성공입니다:

```
✅ Import test passed
✅ Client instantiation successful
✅ Type checking: client is object
✅ Methods available: generate, generateStream, chat, generateContent, generateContentStream, getFallbackStats
```

---

## 🚀 출시 전 최종 체크

```bash
# 1. 빌드 & 패키징
npm run build && npm pack

# 2. 통합 테스트
cd test-integration && ./run-all-tests.sh

# 3. 단위 테스트
cd .. && npm test

# 4. 문서 확인
# README.md의 예제 코드들이 실제로 작동하는지 확인
```

모두 통과하면 **출시 준비 완료**! 🎉

---

## 📚 더 자세한 정보

- **[전체 테스트 가이드](./README.md)**: 상세한 테스트 방법
- **[테스트 시나리오](./TEST_SCENARIOS.md)**: 모든 테스트 케이스
- **[프로젝트 README](../README.md)**: 사용자 문서
