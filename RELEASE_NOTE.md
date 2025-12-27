# 🎉 Release Notes - gemback v0.4.0

**Release Date**: 2025-12-27
**Package Name**: `gemback`
**NPM**: https://www.npmjs.com/package/gemback
**Repository**: https://github.com/Laeyoung/gem-back

---

## 📦 v0.4.0 - Gemini 3.0 Support & Auto-Update System

**gemback v0.4.0** is a major update that adds support for Google Gemini 3.0 Preview models and fully upgrades the internal SDK to significantly improve performance and maintainability.

---

## ✨ Key Changes

### 🚀 Gemini 3.0 Flash Preview Support & Default Model Change

We have changed the primary model in the default fallback chain to **Gemini 3.0 Flash Preview**, which offers a free quota, to improve both cost-efficiency and performance.

#### New Default Fallback Order:
1. **`gemini-3-flash-preview`** (Primary - Free Quota Available) ⚠️
2. **`gemini-2.5-flash`** (Secondary - Stable, High Performance)
3. **`gemini-2.5-flash-lite`** (Tertiary - Lightweight Fallback)

> **Note**: Although it is a Preview model, it was adopted as the default because it provides free usage. If stability is your top priority, please customize the `fallbackOrder`.

### 🤖 Model Auto-Update System

We introduced a system to automatically keep the supported model list up-to-date with Google API updates.

- **Smart Version Detection**: Automatically detects and includes the latest major versions (e.g., Gemini 3.0) when released.
- **Intelligent Filtering**: Automatically excludes aliases like `-latest` or specific snapshot versions like `-001` to keep the list clean with representative models only.
- **npm scripts**: Anyone can easily update the latest model information in the library using the `npm run update-models` command.

### 🔄 SDK Migration & Performance Optimization

We fully upgraded the internal implementation following the change in Google's official Node.js SDK.

- **Migration**: `@google/generative-ai` → **`@google/genai` (v1.33.0)**
- **Client Caching**: Reduced latency by **5-10ms** per request by caching clients per API key.
- **Structure Improvement**: Simplified response handling and streaming logic to improve stability.

---

## 📋 Migration Guide

### Update to v0.4.0

```bash
npm install gemback@0.4.0
# or
yarn upgrade gemback@0.4.0
# or
pnpm update gemback@0.4.0
```

### Notices (No Breaking Changes)

This update guarantees **full backward compatibility**. No code changes are required.
However, please be aware that `gemini-3-flash-preview` is now called first due to the change in the default fallback model order.

---

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/gemback
- **GitHub Repository**: https://github.com/Laeyoung/gem-back
- **Full CHANGELOG**: [CHANGELOG.md](./CHANGELOG.md)
- **Documentation**: [README.md](./README.md)

---

**Made with ❤️ by Laeyoung**
