# 🎉 Release v0.5.0 - Production-Grade Content Generation

**Release Date**: 2026-01-01
**Package**: `gemback`
**NPM**: https://www.npmjs.com/package/gemback
**Repository**: https://github.com/Laeyoung/gem-back

---

## 📦 Overview

**gemback v0.5.0** is a major update that adds complete support for Google GenAI SDK's advanced features. This release introduces 4 core capabilities—Function Calling, System Instructions, Safety Settings, and JSON Mode—enabling safe and structured AI content generation in production environments.

---

## ✨ What's New

### 🎯 1. Function Calling / Tool Use

Enable AI to call external functions for agent workflows and structured interactions.

**Key Features:**
- JSON Schema-based function definitions
- 3 calling modes: `auto`, `any`, `none`
- `allowedFunctionNames` option for restricting callable functions
- Multi-turn conversation support with function results
- Works across all generation methods (`generate`, `generateStream`, `generateContent`)

**Example:**
```typescript
import type { FunctionDeclaration } from 'gemback';

const weatherFunction: FunctionDeclaration = {
  name: 'get_current_weather',
  description: 'Get the current weather in a given location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'The city name' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
    },
    required: ['location']
  }
};

const response = await client.generate("What's the weather in Tokyo?", {
  tools: [weatherFunction],
  toolConfig: { functionCallingMode: 'auto' }
});

if (response.functionCalls) {
  console.log(response.functionCalls[0].name);  // 'get_current_weather'
  console.log(response.functionCalls[0].args);  // { location: 'Tokyo', unit: 'celsius' }
}
```

**Use Cases:**
- AI agents and workflow automation
- External API integration (weather, stocks, databases)
- Real-time information retrieval
- Calculations and data processing

---

### 📝 2. System Instructions

Control model behavior, tone, and output format with persistent instructions.

**Key Features:**
- Supports both string and structured `Content` formats
- Works across all generation methods
- Maintained across fallback attempts
- Freely combinable with other options

**Example:**
```typescript
// Simple string format
const response = await client.generate('Explain TypeScript', {
  systemInstruction: 'You are a helpful programming tutor. Explain concepts clearly for beginners.'
});

// Structured format
const response2 = await client.generate('What is async/await?', {
  systemInstruction: {
    role: 'user',
    parts: [{ text: 'You are a senior engineer. Provide technical, detailed explanations.' }]
  }
});
```

**Use Cases:**
- Role-based assistants (tutor, technical writer, mentor)
- Output format specification (markdown, bullet points)
- Consistent tone and style maintenance
- Behavioral constraints

---

### 🛡️ 3. Safety Settings

Production-compliant content safety and filtering controls.

**Key Features:**
- 4 harm categories (harassment, hate speech, sexually explicit, dangerous content)
- 4 blocking thresholds (none, low and above, medium and above, only high)
- Automatic fallback on safety blocks
- Multiple setting combinations

**Example:**
```typescript
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

const response = await client.generate('Tell a story for kids', {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE  // Strict filtering
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
    }
  ]
});
```

**Use Cases:**
- Safe content generation for children
- Content policy compliance
- Brand-appropriate responses
- Educational content filtering

---

### 🎨 4. JSON Mode (Structured Outputs)

Guaranteed structured JSON responses eliminating parsing errors.

**Key Features:**
- `responseMimeType: 'application/json'` enables JSON mode
- OpenAPI 3.0-style JSON Schema validation
- Automatic JSON parsing (`response.json` field)
- Supports objects, arrays, nested structures
- Type-safe integration with TypeScript interfaces

**Example:**
```typescript
import type { ResponseSchema } from 'gemback';

// Define schema
const userSchema: ResponseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string' }
  },
  required: ['name', 'age', 'email']
};

// Generate with JSON mode
const response = await client.generate('Generate a user profile', {
  responseMimeType: 'application/json',
  responseSchema: userSchema
});

// Type-safe usage
interface User {
  name: string;
  age: number;
  email: string;
}

const user = response.json as User;
console.log(user.name, user.age, user.email);
```

**Use Cases:**
- API response formatting
- Data extraction from unstructured text
- Type-safe API integration
- Database record generation
- Structured content creation

---

## 🔧 Code Quality Improvements

### Enhanced Type Safety

**Improvements:**
- Added `hasFunctionCall()` type guard for runtime/compile-time safety
- Defined `ErrorResponse` interface for better error handling
- Eliminated all `any` types with explicit typing
- Safe property access with optional chaining

**ESLint Clean:**
- 20 errors → 0 errors
- Removed `@typescript-eslint/no-explicit-any` warnings
- Eliminated unsafe member access and assignments
- 100% compliance with strict TypeScript rules

---

## 📊 Testing & Validation

### Comprehensive Test Coverage

**Test Status:**
- ✅ **235 tests** passing (42% increase from Phase 2)
- ✅ **17 test files** with comprehensive scenarios
- ✅ All new features fully tested:
  - `tests/unit/function-calling.test.ts` - 19 tests
  - `tests/unit/system-instructions.test.ts` - 11 tests
  - `tests/unit/safety-settings.test.ts` - 10 tests
  - `tests/unit/json-mode.test.ts` - 15 tests
- ✅ Fallback behavior verified
- ✅ Edge cases and error scenarios tested

---

## 📋 Migration Guide

### Upgrading to v0.5.0

```bash
npm install gemback@0.5.0
# or
yarn upgrade gemback@0.5.0
# or
pnpm update gemback@0.5.0
```

### Breaking Changes

**None** - This update maintains **full backward compatibility**. No code changes required.

**All new features are optional:**
- `systemInstruction` - Can be omitted as before
- `tools` / `toolConfig` - Use only when needed
- `safetySettings` - Default safety settings maintained
- `responseMimeType` / `responseSchema` - Plain text responses by default

### Recommended Usage

For production environments, we recommend leveraging:

1. **System Instructions**: Define consistent AI behavior with role definitions
2. **Safety Settings**: Ensure content policy compliance and brand safety
3. **JSON Mode**: Structured data extraction and API integration
4. **Function Calling**: External system integration and AI agent workflows

---

## 🎯 Common Use Cases

### 1. Building AI Agents

```typescript
// Weather lookup + travel recommendation agent
const response = await client.generate(
  "I'm traveling to Tokyo next week. What should I prepare?",
  {
    systemInstruction: 'You are a helpful travel assistant.',
    tools: [weatherFunction, flightFunction, hotelFunction],
    toolConfig: { functionCallingMode: 'auto' }
  }
);
```

### 2. Safe Content Generation

```typescript
// Educational content for children
const story = await client.generate('Tell an educational story about science', {
  systemInstruction: 'You are a children\'s education content writer.',
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }
  ]
});
```

### 3. Structured Data Extraction

```typescript
// Extract contact information from email
const contactSchema: ResponseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    company: { type: 'string' }
  }
};

const extracted = await client.generate(emailText, {
  systemInstruction: 'Extract contact information from the email.',
  responseMimeType: 'application/json',
  responseSchema: contactSchema
});

const contact = extracted.json as ContactInfo;
```

---

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/gemback
- **GitHub Repository**: https://github.com/Laeyoung/gem-back
- **Full CHANGELOG**: [CHANGELOG.md](./CHANGELOG.md)
- **Documentation**: [README.md](./README.md)
- **Examples**: [examples/](./examples/)
  - `function-calling.ts` - Function Calling examples
  - `system-instructions.ts` - System Instructions examples
  - `safety-settings.ts` - Safety Settings examples
  - `json-mode.ts` - JSON Mode examples

---

## 🙏 Acknowledgments

Thank you to everyone using gemback! v0.5.0 is a significant release enabling safe and structured AI content generation in production environments.

Feedback and contributions are always welcome!

---

**Made with ❤️ by Laeyoung**
