# 🎉 Release Notes - gemback v0.3.1 

**릴리스 날짜**: 2025-12-07
**패키지 이름**: `gemback`
**NPM**: https://www.npmjs.com/package/gemback
**Repository**: https://github.com/Laeyoung/gem-back

---

## 📦 v0.3.1 - Gemini 2.5 기본 모델 업데이트

**gemback v0.3.1**은 Google Gemini API의 무료 티어 정책 변경에 대응하여, 기본 Fallback 모델을 최신 Gemini 2.5 시리즈로 업데이트한 버전입니다.

---

## ✨ 주요 변경사항

### 🚀 기본 모델 업데이트 (Default Model Update)

기본 Fallback 체인이 다음과 같이 간소화되고 최신화되었습니다:

#### 이전 (v0.2.x)
1. `gemini-2.5-flash`
2. `gemini-2.5-flash-lite`
3. `gemini-2.0-flash` (제거됨)
4. `gemini-2.0-flash-lite` (제거됨)

#### 변경 후 (v0.3.1)
1. **`gemini-2.5-flash`** (Primary)
2. **`gemini-2.5-flash-lite`** (Fallback)

**변경 이유:**
- Google Gemini API의 무료 Quota 정책 변경
- 구형 2.0 모델의 우선순위 하락 및 무료 티어 제한 대응
- 최신 2.5 모델의 향상된 성능 활용

---

## 📅 v0.3.0 변경사항 (2025-12-04)

v0.3.0에서는 최신 Gemini 모델에 대한 지원이 추가되었습니다.

### ✅ Gemini 2.5 지원 추가
- **`gemini-2.5-flash`** 지원 추가
- **`gemini-2.5-flash-lite`** 지원 추가
- 타입 정의 업데이트

---

## 📋 마이그레이션 가이드

### v0.3.1로 업데이트

```bash
npm install gemback@0.3.1
# 또는
yarn upgrade gemback@0.3.1
# 또는
pnpm update gemback@0.3.1
```

### 코드 변경 필요 사항

별도의 코드 변경은 필요하지 않습니다. 다만, **기본 설정을 그대로 사용하는 경우** 자동으로 새로운 Fallback 순서가 적용됩니다.

만약 `fallbackOrder`를 명시적으로 설정하여 사용하고 있었다면, 기존 설정이 유지됩니다.

```typescript
// 기본 설정을 사용하는 경우 -> 자동으로 2.5 모델만 사용됨
const client = new GemBack({ apiKey: '...' });

// 명시적으로 설정한 경우 -> 설정한 순서대로 유지됨
const client = new GemBack({
  apiKey: '...',
  fallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash'] // 여전히 작동함
});
```

---

## 📊 v0.3.1 통계

- **변경된 파일**: 7개
- **주요 변경**: 기본 모델 설정 업데이트
- **테스트**: 모든 테스트 통과 (165개)

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

*gemback v0.3.1 - Faster, Newer, Better!*
