# v0.2.0 출시 전 테스트 시나리오

실제 유저 관점에서 gemback 라이브러리를 테스트하기 위한 종합 시나리오입니다.

## 📋 목차

1. [사전 준비](#사전-준비)
2. [패키지 무결성 테스트](#패키지-무결성-테스트)
3. [모듈 시스템별 테스트](#모듈-시스템별-테스트)
4. [기능별 테스트](#기능별-테스트)
5. [성능 테스트](#성능-테스트)
6. [문서 검증](#문서-검증)
7. [체크리스트](#최종-체크리스트)

---

## 사전 준비

### 1. 패키지 빌드 확인

```bash
# 프로젝트 루트에서
npm run build
npm pack
```

**확인 사항:**
- ✅ `dist/` 디렉토리에 파일 생성 (index.js, index.mjs, index.d.ts, index.d.mts)
- ✅ `gemback-0.2.0.tgz` 파일 생성
- ✅ 빌드 에러 없음

### 2. 패키지 내용 검증

```bash
tar -tzf gemback-0.2.0.tgz
```

**확인 사항:**
- ✅ dist/ 파일들 포함
- ✅ README.md 포함
- ✅ LICENSE 포함
- ✅ package.json 포함

---

## 패키지 무결성 테스트

### 테스트 1: 패키지 정보 확인

```bash
npm info ./gemback-0.2.0.tgz
```

**확인 사항:**
- ✅ 버전: 0.2.0
- ✅ main: dist/index.js
- ✅ module: dist/index.mjs
- ✅ types: dist/index.d.ts
- ✅ exports 필드 올바름

### 테스트 2: 의존성 확인

**확인 사항:**
- ✅ dependencies: @google/generative-ai만 포함
- ✅ devDependencies: 패키지에 포함되지 않음
- ✅ peerDependencies: 없음 (올바름)

---

## 모듈 시스템별 테스트

### CommonJS 테스트

```bash
cd test-integration/commonjs-test
npm install
npm install ../../gemback-0.2.0.tgz
npm test
npm run test:all  # API 키가 있는 경우
```

**확인 사항:**
- ✅ `require('gemback')` 동작
- ✅ GeminiBackClient 클래스 로드
- ✅ 모든 메서드 접근 가능
- ✅ API 호출 정상 동작 (키 있는 경우)

### ESM 테스트

```bash
cd test-integration/esm-test
npm install
npm install ../../gemback-0.2.0.tgz
npm test
npm run test:all  # API 키가 있는 경우
```

**확인 사항:**
- ✅ `import { GeminiBackClient } from 'gemback'` 동작
- ✅ GeminiBackClient 클래스 로드
- ✅ 모든 메서드 접근 가능
- ✅ API 호출 정상 동작 (키 있는 경우)

### TypeScript 테스트

```bash
cd test-integration/typescript-test
npm install
npm install ../../gemback-0.2.0.tgz
npm run build  # TypeScript 컴파일 확인
npm test
npm run test:all  # API 키가 있는 경우
```

**확인 사항:**
- ✅ TypeScript 컴파일 성공
- ✅ 타입 정의 파일 인식
- ✅ 타입 추론 정상 동작
- ✅ strict 모드 통과
- ✅ API 호출 정상 동작 (키 있는 경우)

---

## 기능별 테스트

### Phase 1 기능 (v0.1.0)

#### 1. 기본 텍스트 생성
```typescript
const client = new GeminiBackClient({ apiKey: 'YOUR_KEY' });
const response = await client.generate('Hello');
```

**확인 사항:**
- ✅ 응답 수신
- ✅ response.text 존재
- ✅ response.model 존재

#### 2. Fallback 동작
```typescript
const client = new GeminiBackClient({
  apiKey: 'YOUR_KEY',
  fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash']
});
```

**확인 사항:**
- ✅ 첫 번째 모델 실패 시 두 번째 모델로 자동 전환
- ✅ 재시도 로직 동작
- ✅ 에러 핸들링 정상

#### 3. Streaming
```typescript
const stream = client.generateStream('Tell me a story');
for await (const chunk of stream) {
  console.log(chunk.text);
}
```

**확인 사항:**
- ✅ 스트리밍 응답 수신
- ✅ 청크 단위로 텍스트 수신
- ✅ 완료까지 정상 동작

#### 4. Chat 인터페이스
```typescript
const response = await client.chat([
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi!' },
  { role: 'user', content: 'How are you?' }
]);
```

**확인 사항:**
- ✅ 대화 맥락 유지
- ✅ 멀티턴 대화 가능
- ✅ 응답 정상

#### 5. 통계 수집
```typescript
const stats = client.getFallbackStats();
console.log(stats);
```

**확인 사항:**
- ✅ totalRequests 카운트
- ✅ successRate 계산
- ✅ modelUsage 추적

### Phase 2 기능 (v0.2.0)

#### 6. Multi-Key Rotation
```typescript
const client = new GeminiBackClient({
  apiKeys: ['KEY1', 'KEY2', 'KEY3'],
  apiKeyRotationStrategy: 'round-robin'
});
```

**확인 사항:**
- ✅ 키 순환 동작
- ✅ round-robin 전략 동작
- ✅ least-used 전략 동작
- ✅ apiKeyStats 수집

#### 7. Monitoring
```typescript
const client = new GeminiBackClient({
  apiKey: 'YOUR_KEY',
  enableMonitoring: true,
  enableRateLimitPrediction: true
});
```

**확인 사항:**
- ✅ Rate limit 추적
- ✅ RPM 계산 정확
- ✅ 경고 임계값 동작 (80%, 90%)
- ✅ 모델 health 모니터링
- ✅ p50, p95, p99 응답 시간 계산

#### 8. Health Monitoring
```typescript
const stats = client.getFallbackStats();
console.log(stats.monitoring.modelHealth);
```

**확인 사항:**
- ✅ healthy/degraded/unhealthy 상태 판정
- ✅ successRate 계산
- ✅ averageResponseTime 계산
- ✅ consecutiveFailures 추적

---

## 성능 테스트

### 1. 연속 요청 테스트
```typescript
// 10개 연속 요청
for (let i = 0; i < 10; i++) {
  await client.generate(`Request ${i}`);
}
```

**확인 사항:**
- ✅ 메모리 누수 없음
- ✅ 응답 시간 일정
- ✅ 에러 없음

### 2. 동시 요청 테스트
```typescript
const promises = Array(5).fill(0).map((_, i) =>
  client.generate(`Concurrent request ${i}`)
);
await Promise.all(promises);
```

**확인 사항:**
- ✅ 모든 요청 완료
- ✅ 에러 없음
- ✅ 통계 정확하게 수집

### 3. Rate Limit 테스트
```typescript
// 빠르게 15개 요청 (무료 tier RPM 초과)
const promises = Array(15).fill(0).map((_, i) =>
  client.generate(`Rate limit test ${i}`)
);
await Promise.all(promises);
```

**확인 사항:**
- ✅ 429 에러 발생 시 fallback 동작
- ✅ Rate limit 경고 표시
- ✅ 최종적으로 모든 요청 성공 또는 명확한 에러

---

## 문서 검증

### README.md 확인

**확인 사항:**
- ✅ 설치 방법 정확
- ✅ 코드 예제 실행 가능
- ✅ API 문서 정확
- ✅ 버전 정보 (0.2.0) 표시
- ✅ 한글 문서(README.ko.md)와 동기화

### Examples 확인

```bash
cd examples
# 각 예제 실행 테스트
```

**확인 사항:**
- ✅ 모든 예제 코드 실행 가능
- ✅ README와 일치
- ✅ 에러 없음

### TypeScript 타입 정의

**확인 사항:**
- ✅ 모든 public API 타입 정의
- ✅ JSDoc 주석 포함
- ✅ 타입 export 정확
- ✅ IDE 자동완성 동작

---

## 최종 체크리스트

### 빌드 & 패키징
- [ ] `npm run build` 성공
- [ ] `npm pack` 성공
- [ ] 패키지 크기 적절 (~25KB)
- [ ] 불필요한 파일 제외됨

### 모듈 시스템
- [ ] CommonJS 로딩 성공
- [ ] ESM 로딩 성공
- [ ] TypeScript 타입 정의 동작
- [ ] Node.js 18+ 호환성

### 핵심 기능 (Phase 1)
- [ ] 기본 텍스트 생성
- [ ] Fallback 동작
- [ ] Retry 로직
- [ ] Streaming
- [ ] Chat 인터페이스
- [ ] 통계 수집

### 고급 기능 (Phase 2)
- [ ] Multi-key rotation
- [ ] Round-robin 전략
- [ ] Least-used 전략
- [ ] Rate limit tracking
- [ ] Health monitoring
- [ ] Predictive warnings

### 에러 처리
- [ ] 잘못된 API 키 처리
- [ ] 네트워크 에러 처리
- [ ] Rate limit 에러 처리
- [ ] 모든 모델 실패 시 처리

### 문서
- [ ] README.md 정확성
- [ ] README.ko.md 정확성
- [ ] 코드 예제 실행 가능
- [ ] API 문서 완전성
- [ ] CHANGELOG.md 업데이트

### 성능
- [ ] 연속 요청 안정성
- [ ] 동시 요청 처리
- [ ] Rate limit 대응
- [ ] 메모리 누수 없음

### 배포 준비
- [ ] package.json 버전 0.2.0
- [ ] LICENSE 파일 포함
- [ ] .npmignore 적절
- [ ] Repository 링크 정확
- [ ] Keywords 적절

---

## 테스트 실행 순서

1. **빌드 검증**
   ```bash
   npm run build
   npm pack
   ```

2. **모듈 시스템 테스트**
   ```bash
   cd test-integration/commonjs-test && npm install && npm test
   cd ../esm-test && npm install && npm test
   cd ../typescript-test && npm install && npm test
   ```

3. **전체 기능 테스트** (API 키 필요)
   ```bash
   export GEMINI_API_KEY=your_api_key
   cd test-integration/commonjs-test && npm run test:all
   cd ../esm-test && npm run test:all
   cd ../typescript-test && npm run test:all
   ```

4. **기존 단위 테스트**
   ```bash
   npm test
   ```

5. **문서 검증**
   - README.md 코드 예제 실행
   - examples/ 디렉토리 예제 실행

---

## 문제 발생 시 대응

### 타입 에러
- `dist/*.d.ts` 파일 확인
- `tsconfig.json` 설정 확인
- TypeScript 버전 확인

### 모듈 로딩 실패
- `package.json` exports 필드 확인
- main, module, types 필드 확인
- Node.js 버전 확인 (18+)

### API 에러
- API 키 유효성 확인
- Rate limit 확인
- 네트워크 연결 확인

### 빌드 실패
- 의존성 설치 확인
- Node.js 버전 확인
- tsup 설정 확인

---

## 성공 기준

✅ **모든 테스트 통과**
✅ **문서와 코드 일치**
✅ **타입 정의 완벽**
✅ **성능 문제 없음**
✅ **에러 핸들링 완벽**

이 모든 조건이 충족되면 **v0.2.0 출시 준비 완료**입니다!
