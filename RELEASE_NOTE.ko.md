# 🎉 Release Notes - gemback v0.4.0

**릴리스 날짜**: 2025-12-27
**패키지 이름**: `gemback`
**NPM**: https://www.npmjs.com/package/gemback
**Repository**: https://github.com/Laeyoung/gem-back

---

## 📦 v0.4.0 - Gemini 3.0 Support & Auto-Update System

**gemback v0.4.0**은 Google Gemini 3.0 Preview 모델 지원을 추가하고, 내부 SDK를 전면 업그레이드하여 성능과 유지보수성을 대폭 향상시킨 메이저 업데이트입니다.

---

## ✨ 주요 변경사항

### 🚀 Gemini 3.0 Flash Preview 지원 및 기본 모델 변경

무료 Quota가 제공되는 **Gemini 3.0 Flash Preview**를 기본 Fallback 체인의 최우선 모델로 변경하여 비용 효율성과 성능을 동시에 개선했습니다.

#### 변경된 기본 Fallback 순서:
1. **`gemini-3-flash-preview`** (Primary - 무료 Quota 제공) ⚠️
2. **`gemini-2.5-flash`** (Secondary - 안정적, 고성능)
3. **`gemini-2.5-flash-lite`** (Tertiary - 경량 Fallback)

> **참고**: Preview 모델이지만 무료 사용량이 제공되므로 기본값으로 채택되었습니다. 안정성이 최우선인 경우 `fallbackOrder`를 커스텀하여 사용하세요.

### 🤖 모델 자동 업데이트 시스템 (Model Auto-Update System)

Google API 업데이트에 맞춰 지원 모델 목록을 자동으로 최신화하는 시스템이 도입되었습니다.

- **스마트 버전 감지**: Gemini 3.0과 같은 최신 메이저 버전이 출시되면 자동으로 감지하여 목록에 포함합니다.
- **지능형 필터링**: `-latest` 별칭이나 `-001` 같은 특정 스냅샷 버전을 자동으로 제외하고 대표 모델만 깔끔하게 관리합니다.
- **npm scripts**: `npm run update-models` 명령어로 누구나 쉽게 최신 모델 정보를 라이브러리에 반영할 수 있습니다.

### 🔄 SDK 마이그레이션 & 성능 최적화

Google의 공식 Node.js SDK가 변경됨에 따라 내부 구현을 전면 업그레이드했습니다.

- **Migration**: `@google/generative-ai` → **`@google/genai` (v1.33.0)**
- **Client Caching**: API 키별로 클라이언트를 캐싱하여 요청당 **5-10ms**의 지연 시간을 단축했습니다.
- **구조 개선**: 응답 처리 및 스트리밍 로직을 간소화하여 안정성을 높였습니다.

---

## 📋 마이그레이션 가이드

### v0.4.0으로 업데이트

```bash
npm install gemback@0.4.0
# 또는
yarn upgrade gemback@0.4.0
# 또는
pnpm update gemback@0.4.0
```

### 주의사항 (Breaking Changes 없음)

이번 업데이트는 **완전한 하위 호환성**을 보장합니다. 기존 코드를 수정할 필요가 없습니다.
단, 기본 Fallback 모델 순서가 변경되었으므로 `gemini-3-flash-preview`가 먼저 호출된다는 점만 인지하시면 됩니다.

---

## 🔗 링크

- **NPM 패키지**: https://www.npmjs.com/package/gemback
- **GitHub 저장소**: https://github.com/Laeyoung/gem-back
- **전체 CHANGELOG**: [CHANGELOG.md](./CHANGELOG.md)
- **문서**: [README.md](./README.md)

---

**Made with ❤️ by Laeyoung**