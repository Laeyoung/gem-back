# Gem Back - Integration Testing Guide

v0.2.0 출시 전 실제 유저 관점에서 라이브러리를 테스트하기 위한 통합 테스트 환경입니다.

## 📁 디렉토리 구조

```
test-integration/
├── commonjs-test/       # CommonJS 환경 테스트
├── esm-test/           # ESM 환경 테스트
├── typescript-test/    # TypeScript 환경 테스트
├── TEST_SCENARIOS.md   # 상세 테스트 시나리오
└── README.md           # 이 파일
```

## 🎯 목적

실제 사용자가 npm에서 패키지를 설치하고 사용하는 것과 동일한 환경에서 테스트합니다:

1. **패키지 무결성**: npm pack으로 생성된 실제 배포 파일 테스트
2. **모듈 호환성**: CommonJS, ESM, TypeScript 모두에서 정상 동작 확인
3. **타입 안정성**: TypeScript 타입 정의가 올바르게 작동하는지 확인
4. **기능 완전성**: 모든 기능이 실제 사용 환경에서 동작하는지 확인

## 🚀 빠른 시작

### 1. 패키지 빌드

프로젝트 루트에서:

```bash
npm run build
npm pack
```

이렇게 하면 `gemback-0.2.0.tgz` 파일이 생성됩니다.

### 2. 전체 테스트 실행 (API 키 없이)

```bash
# 모든 환경에서 구조 테스트 실행
./run-all-tests.sh
```

또는 개별적으로:

```bash
# CommonJS 테스트
cd commonjs-test
npm install
npm install ../../gemback-0.2.0.tgz
npm test

# ESM 테스트
cd ../esm-test
npm install
npm install ../../gemback-0.2.0.tgz
npm test

# TypeScript 테스트
cd ../typescript-test
npm install
npm install ../../gemback-0.2.0.tgz
npm test
```

### 3. 전체 기능 테스트 (API 키 필요)

```bash
# API 키 설정
export GEMINI_API_KEY=your_api_key_here

# 전체 기능 테스트
cd commonjs-test && npm run test:all
cd ../esm-test && npm run test:all
cd ../typescript-test && npm run test:all
```

## 📋 테스트 종류

### 기본 테스트 (API 키 불필요)

각 환경에서 다음을 테스트합니다:

- ✅ 패키지 로딩
- ✅ 클래스 인스턴스화
- ✅ 메서드 존재 확인
- ✅ 타입 체크 (TypeScript)
- ✅ 에러 핸들링

### 전체 기능 테스트 (API 키 필요)

실제 API 호출을 포함한 모든 기능 테스트:

#### Phase 1 기능
- ✅ 기본 텍스트 생성
- ✅ Streaming 응답
- ✅ Chat 인터페이스
- ✅ Fallback 동작
- ✅ Retry 로직
- ✅ 통계 수집

#### Phase 2 기능
- ✅ Multi-key rotation
- ✅ Round-robin 전략
- ✅ Least-used 전략
- ✅ Rate limit tracking
- ✅ Health monitoring
- ✅ Predictive warnings

## 🔍 각 테스트 환경 설명

### CommonJS Test

**대상 사용자**: Node.js 기본 환경, 레거시 프로젝트

**테스트 내용**:
- `require()` 구문으로 로딩
- CommonJS 모듈 시스템 호환성
- `package.json`의 `main` 필드 검증

**파일**:
- `index.js`: 기본 구조 테스트
- `test-all-features.js`: 전체 기능 테스트

### ESM Test

**대상 사용자**: 최신 Node.js 프로젝트, 프론트엔드 번들러 사용자

**테스트 내용**:
- `import` 구문으로 로딩
- ESM 모듈 시스템 호환성
- `package.json`의 `module` 필드 검증
- Tree-shaking 가능성

**파일**:
- `index.mjs`: 기본 구조 테스트
- `test-all-features.mjs`: 전체 기능 테스트

### TypeScript Test

**대상 사용자**: TypeScript 프로젝트 개발자

**테스트 내용**:
- TypeScript 컴파일 성공
- 타입 정의 파일 (`.d.ts`) 정확성
- 타입 추론 동작
- Strict 모드 호환성
- IDE 자동완성

**파일**:
- `src/index.ts`: 기본 타입 안정성 테스트
- `src/test-all-features.ts`: 전체 기능 타입 안정성 테스트

## 📊 테스트 결과 해석

### ✅ 성공 케이스

```
=== CommonJS Integration Test ===

✅ Import test passed - gemback is correctly loaded in CommonJS
✅ Client instantiation successful
✅ Type checking: client is object
✅ Methods available: generate, generateStream, chat, getFallbackStats
```

### ❌ 실패 케이스 예시

```
❌ Failed to create client: Cannot find module 'gemback'
```

이런 경우:
1. `npm install ../../gemback-0.2.0.tgz` 실행했는지 확인
2. `package.json`의 exports 필드 확인
3. Node.js 버전 확인 (18+ 필요)

## 🐛 문제 해결

### "Cannot find module 'gemback'"

```bash
npm install ../../gemback-0.2.0.tgz
```

### "Module not found: Error: Package path . is not exported"

`package.json`의 `exports` 필드를 확인하세요.

### TypeScript 컴파일 에러

```bash
npm run build  # 타입 에러 확인
```

타입 정의 파일이 올바른지 확인하세요.

### API 에러

```bash
# API 키 확인
echo $GEMINI_API_KEY

# 키 다시 설정
export GEMINI_API_KEY=your_api_key
```

## 📝 테스트 체크리스트

출시 전 다음 항목들을 확인하세요:

### 패키지 빌드
- [ ] `npm run build` 성공
- [ ] `npm pack` 성공
- [ ] dist/ 파일들 생성됨
- [ ] gemback-0.2.0.tgz 생성됨

### CommonJS 환경
- [ ] 패키지 설치 성공
- [ ] require() 로딩 성공
- [ ] 기본 테스트 통과
- [ ] 전체 기능 테스트 통과 (API 키 있는 경우)

### ESM 환경
- [ ] 패키지 설치 성공
- [ ] import 로딩 성공
- [ ] 기본 테스트 통과
- [ ] 전체 기능 테스트 통과 (API 키 있는 경우)

### TypeScript 환경
- [ ] 패키지 설치 성공
- [ ] TypeScript 컴파일 성공
- [ ] 타입 체크 통과
- [ ] 기본 테스트 통과
- [ ] 전체 기능 테스트 통과 (API 키 있는 경우)

### 기능 검증
- [ ] Phase 1 기능 (텍스트 생성, 스트리밍, 채팅 등)
- [ ] Phase 2 기능 (Multi-key, 모니터링 등)
- [ ] 에러 핸들링
- [ ] 통계 수집

### 문서
- [ ] README.md 예제 실행 가능
- [ ] 타입 정의 문서화
- [ ] 예제 코드 동작 확인

## 📖 추가 문서

- **[상세 테스트 시나리오](./TEST_SCENARIOS.md)**: 모든 테스트 케이스 및 시나리오
- **[프로젝트 README](../README.md)**: 사용자 문서
- **[CHANGELOG](../CHANGELOG.md)**: 변경 사항 로그

## 🎉 출시 준비 완료 기준

다음 모든 조건이 충족되어야 합니다:

1. ✅ 모든 환경(CommonJS, ESM, TypeScript)에서 테스트 통과
2. ✅ Phase 1 & Phase 2 모든 기능 동작 확인
3. ✅ 타입 정의 완벽
4. ✅ 문서와 실제 동작 일치
5. ✅ 에러 핸들링 완벽
6. ✅ 성능 이슈 없음

모든 조건 충족 시 **v0.2.0 출시 가능**! 🚀

## 💡 팁

### 빠른 반복 테스트

패키지 수정 후 재테스트:

```bash
# 루트에서
npm run build && npm pack

# 테스트 디렉토리에서
npm install ../../gemback-0.2.0.tgz --force
npm test
```

### API 키 없이 구조만 테스트

API 키 없이도 패키지 로딩, 타입 체크 등은 가능합니다:

```bash
npm test  # API 키 없이 실행 가능
```

### 특정 기능만 테스트

각 테스트 파일을 직접 실행할 수도 있습니다:

```bash
node index.js  # 기본 테스트만
node test-all-features.js  # 전체 테스트
```

---

**Happy Testing! 🧪**
