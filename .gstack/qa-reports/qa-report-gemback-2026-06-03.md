# QA Report — gemback (branch: fix/quota-429-fallback)

- **Date:** 2026-06-03
- **Base:** master
- **Surface:** Headless TypeScript library (no web/UI) — QA = static gates + live public-API functional test against the real Gemini API
- **Scope:** Branch diff = error-classification rewrite (`src/utils/error-handler.ts`) + tests
- **Result:** ✅ Clean. No bugs found, no fixes required.

## Static quality gates
| Gate | Result |
|---|---|
| vitest | ✅ 303 passed (20 files) |
| typecheck (tsc --noEmit) | ✅ clean |
| eslint | ✅ clean |
| build (tsup) | ✅ CJS 57.87 KB + ESM 56.50 KB + DTS 8.03 KB |

## Live functional QA (real Gemini API)
Public API exercised as a real caller. `gemini-3.5-flash` was RPD-exhausted from prior testing, enabling a real 429 fallback test.

| # | Scenario | Result | Evidence |
|---|---|---|---|
| QA-1 | `generate()` returns text | ✅ | model=gemini-3.1-flash-lite, text="pong" |
| QA-2 | `chat()` keeps multi-turn context | ✅ | recalled name "Sam" |
| QA-3 | `generateContent()` structured JSON (responseSchema) | ✅ | `{"landmark":"Eiffel Tower","city":"Paris"}` |
| QA-4 | `generateStream()` streams + completes | ✅ | chunks=1, isComplete=true |
| QA-5 | **Live 429 → fallback** (exhausted model first) | ✅ | fell back to gemini-3.1-flash-lite |
| QA-6 | `getFallbackStats()` tracks usage + monitoring | ✅ | total=1, usage=1, monitoring on |
| QA-7 | Auth error stops chain (no fallback) | ✅ | code=AUTH_ERROR, attempts=1 |

**Live QA: 7 passed, 0 failed.**

## Health score
Functional health: **100/100** (standard web rubric N/A — no console/links/visual surface). All static gates and all live public-API paths pass.

## Fixes applied
None — QA found no issues. The branch's error-classification fix and the 7-iteration dev-review-loop hardening are verified working live.

## PR summary
> QA: static gates green (303 tests, typecheck, lint, build); 7/7 live API scenarios pass incl. live 429→fallback. No issues, health 100.
