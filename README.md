# 💎 Gem Back

> Smart Gemini API Fallback Library with Multi-Key Rotation & Monitoring

[![npm version](https://badge.fury.io/js/gemback.svg)](https://www.npmjs.com/package/gemback)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-216%20passing-brightgreen.svg)](https://github.com/Laeyoung/gem-back)

**Gem Back** is an NPM library that provides an intelligent fallback system and production-grade monitoring for Google Gemini API, automatically handling RPM (Requests Per Minute) rate limits.

**[한국어 문서](./README.ko.md)** | **[Examples](./examples)** | **[Changelog](./CHANGELOG.md)**

---

## 🎯 Why Gem Back?

The Gemini API has **RPM (Requests Per Minute) limits** on the free tier, causing `429 Too Many Requests` errors in high-traffic scenarios. Gem Back solves this problem with:

### Key Features ✨

- ✅ **Automatic Fallback**: Seamlessly switches to alternate models when one fails
- ✅ **Smart Retry**: Handles transient errors with Exponential Backoff
- ✅ **Multi-Key Rotation**: Rotates through multiple API keys to bypass RPM limits
- ✅ **Streaming Support**: Real-time response streaming (`generateStream()`)
- ✅ **Conversational Interface**: Multi-turn chat support (`chat()`)
- ✅ **Statistics Tracking**: Monitor usage and success rates per model/key
- ✅ **Zero Configuration**: Works out of the box with sensible defaults
- ✅ **Full TypeScript Support**: Complete type definitions and autocomplete
- ✅ **Dual Module Format**: CommonJS + ESM support
- ✅ **Extensively Tested**: 165 tests verify reliability
- ✅ **Monitoring & Tracking**: Rate limit prediction and model health monitoring

---

## 🚀 Supported Models

Gem Back supports automatic fallback across Gemini models:

**Default Fallback Chain** (Optimized for Free Tier):
1. `gemini-3-flash-preview` (Free quota available) ⚠️
2. `gemini-2.5-flash` (Stable, high performance)
3. `gemini-2.5-flash-lite` (Lightweight fallback)

**Other Supported Models**:
- `gemini-3-pro-preview`
- `gemini-2.5-pro`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`

**Model Auto-Update System**: The library includes automation scripts to keep the model list current with Google's API updates. See [Contributing Guide](./CONTRIBUTING.md) for details on updating models.

---

## 📦 Installation

```bash
npm install gemback
# or
yarn add gemback
# or
pnpm add gemback
```

---

## ⚡ Quick Start

### Basic Usage

```typescript
import { GemBack } from 'gemback';

// Create client
const client = new GemBack({
  apiKey: process.env.GEMINI_API_KEY
});

// Generate text
const response = await client.generate('Hello, Gemini!');
console.log(response.text);
// Automatically selects the best model and handles fallback
```

### Custom Fallback Order

```typescript
const client = new GemBack({
  apiKey: process.env.GEMINI_API_KEY,
  fallbackOrder: [
    'gemini-3-pro-preview',  // Optional: Include preview models explicitly
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ],
  maxRetries: 3,
  timeout: 30000,
  debug: true // Enable detailed logging
});
```

### Streaming Response

```typescript
const stream = client.generateStream('Tell me a long story');

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### Multi-Key Rotation (New!)

Effectively bypass RPM limits by using multiple API keys:

```typescript
const client = new GemBack({
  apiKeys: [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ],
  apiKeyRotationStrategy: 'round-robin' // or 'least-used'
});

// Automatically rotates through keys for each request
const response1 = await client.generate('First question'); // Uses key_1
const response2 = await client.generate('Second question'); // Uses key_2
const response3 = await client.generate('Third question'); // Uses key_3

// Check per-key statistics
const stats = client.getFallbackStats();
console.log(stats.apiKeyStats); // Usage and success rate per key
```

**Rotation Strategies:**
- `round-robin` (default): Rotate through keys sequentially
- `least-used`: Prioritize the least-used key

### Monitoring & Tracking (New!)

Improve stability with real-time rate limit tracking and model health monitoring:

```typescript
const client = new GemBack({
  apiKey: process.env.GEMINI_API_KEY,
  enableMonitoring: true  // Enable monitoring
});

// Use the API
await client.generate('Question 1');
await client.generate('Question 2');
// ...

// Get detailed monitoring statistics
const stats = client.getFallbackStats();

// Check rate limit status
console.log(stats.monitoring?.rateLimitStatus);
// [
//   {
//     model: 'gemini-2.5-flash',
//     currentRPM: 5,          // Current requests per minute
//     maxRPM: 15,             // Maximum RPM
//     utilizationPercent: 33, // Utilization percentage
//     isNearLimit: false,     // Near limit warning
//     willExceedSoon: false,  // Will exceed soon warning
//     windowStats: {
//       requestsInLastMinute: 5,
//       requestsInLast5Minutes: 12,
//       averageRPM: 2.4
//     }
//   }
// ]

// Check model health status
console.log(stats.monitoring?.modelHealth);
// [
//   {
//     model: 'gemini-2.5-flash',
//     status: 'healthy',           // healthy | degraded | unhealthy
//     successRate: 0.98,           // Success rate
//     averageResponseTime: 1234,   // Average response time (ms)
//     availability: 0.99,          // Availability
//     consecutiveFailures: 0,      // Consecutive failures
//     metrics: {
//       totalRequests: 100,
//       successfulRequests: 98,
//       failedRequests: 2,
//       p50ResponseTime: 1100,     // 50th percentile
//       p95ResponseTime: 1800,     // 95th percentile
//       p99ResponseTime: 2100      // 99th percentile
//     }
//   }
// ]

// Overall summary
console.log(stats.monitoring?.summary);
// {
//   healthyModels: 3,
//   degradedModels: 1,
//   unhealthyModels: 0,
//   overallSuccessRate: 0.96,
//   averageResponseTime: 1500
// }
```

**Monitoring Features:**
- ✅ **Rate Limit Tracking**: Real-time RPM usage tracking per model
- ✅ **Predictive Warnings**: Automatic warnings before hitting limits (80%, 90% thresholds)
- ✅ **Health Monitoring**: Track success rate, response time, and availability per model
- ✅ **Percentile Metrics**: Analyze p50, p95, p99 response times
- ✅ **Failure Detection**: Automatic status detection (healthy/degraded/unhealthy)

---

## 📖 Core Features

### 1. Automatic Fallback

```typescript
// Automatically falls back to gemini-2.5-flash-lite
// when gemini-2.5-flash hits rate limit
const response = await client.generate('Complex question');
```

### 2. Retry Logic

```typescript
const client = new GemBack({
  apiKey: 'YOUR_KEY',
  maxRetries: 3, // Max retries per model
  retryDelay: 1000 // Initial retry delay (ms)
});
```

### 3. Error Handling

```typescript
try {
  const response = await client.generate('Hello');
} catch (error) {
  if (error instanceof GeminiBackError) {
    console.log('Models attempted:', error.allAttempts);
    console.log('Last error:', error.message);
  }
}
```

### 4. Statistics

```typescript
const stats = client.getFallbackStats();
console.log(stats);
// {
//   totalRequests: 100,
//   successRate: 0.95,
//   failureCount: 5,
//   modelUsage: {
//     'gemini-2.5-flash': 70,
//     'gemini-2.5-flash-lite': 30
//   },
//   apiKeyStats: [  // Only in multi-key mode
//     {
//       keyIndex: 0,
//       totalRequests: 35,
//       successCount: 33,
//       failureCount: 2,
//       successRate: 0.94,
//       lastUsed: Date
//     },
//     // ... other keys
//   ],
//   monitoring: {  // Only when enableMonitoring: true
//     rateLimitStatus: [...],  // Rate limit status per model
//     modelHealth: [...],      // Health status per model
//     summary: {
//       healthyModels: 3,
//       degradedModels: 1,
//       unhealthyModels: 0,
//       overallSuccessRate: 0.96,
//       averageResponseTime: 1500
//     }
//   }
// }
```

### 5. System Instructions (v0.5.0+)

Control the model's behavior, personality, and response style:

```typescript
// String format
const response = await client.generate('Explain TypeScript', {
  systemInstruction: 'You are a helpful programming tutor. Explain concepts clearly for beginners.',
});

// Structured Content format
const response2 = await client.generate('What is async/await?', {
  systemInstruction: {
    role: 'user',
    parts: [{ text: 'You are a senior engineer. Provide technical, detailed explanations.' }],
  },
});

// Works with all generation methods
const stream = client.generateStream('Explain promises', {
  systemInstruction: 'Keep explanations under 100 words. Use bullet points.',
});

const chatResponse = await client.chat(messages, {
  systemInstruction: 'You are a friendly coding mentor. Use analogies to explain.',
});
```

**Use Cases:**
- Guide model personality and tone
- Enforce output formatting requirements
- Create role-based assistants (tutor, technical writer, etc.)
- Maintain consistent behavior across conversations

### 6. Function Calling / Tool Use (v0.5.0+)

Enable the model to call external functions with structured parameters:

```typescript
import type { FunctionDeclaration } from 'gemback';

// Define a function
const weatherFunction: FunctionDeclaration = {
  name: 'get_current_weather',
  description: 'Get the current weather in a given location',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city name, e.g. Tokyo, London',
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
      },
    },
    required: ['location'],
  },
};

// Use the function
const response = await client.generate("What's the weather in Tokyo?", {
  tools: [weatherFunction],
  toolConfig: {
    functionCallingMode: 'auto', // 'auto' | 'any' | 'none'
  },
});

// Check if model called the function
if (response.functionCalls && response.functionCalls.length > 0) {
  response.functionCalls.forEach((call) => {
    console.log('Function:', call.name);
    console.log('Arguments:', call.args);

    // Execute your actual function here
    const result = getCurrentWeather(call.args.location, call.args.unit);
    console.log('Result:', result);
  });
}
```

**Function Calling Modes:**
- `auto`: Model decides when to call functions (default)
- `any`: Force model to call at least one function
- `none`: Disable function calling

**Advanced Features:**
```typescript
// Restrict to specific functions
const response = await client.generate(prompt, {
  tools: [weatherFunction, calculatorFunction, databaseFunction],
  toolConfig: {
    functionCallingMode: 'any',
    allowedFunctionNames: ['get_current_weather'], // Only allow weather
  },
});

// Multi-turn conversation with function results
const followUpResponse = await client.generateContent([
  { role: 'user', parts: [{ text: "What's the weather?" }] },
  { role: 'model', parts: [{ functionCall: { name: 'get_current_weather', args: {...} } }] },
  { role: 'user', parts: [{ functionResponse: { name: 'get_current_weather', response: {...} } }] },
  { role: 'user', parts: [{ text: 'Should I bring an umbrella?' }] },
]);
```

**Use Cases:**
- Integrate with external APIs and databases
- Perform calculations and data processing
- Access real-time information
- Create structured workflows and automation
- Build AI agents with tool access

### 7. Safety Settings (v0.6.0+)

Configure content filtering and safety thresholds for different harm categories:

```typescript
import { HarmCategory, HarmBlockThreshold } from '@google/genai';

// Basic safety settings
const response = await client.generate('Tell me about content moderation', {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// Strict filtering for children's content
const childContent = await client.generate('Tell a story for kids', {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
  ],
});

// Combine with other options
const response3 = await client.generate('Write an educational article', {
  systemInstruction: 'You are an educational content writer.',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
  temperature: 0.7,
});
```

**Available Harm Categories:**
- `HARM_CATEGORY_HARASSMENT`
- `HARM_CATEGORY_HATE_SPEECH`
- `HARM_CATEGORY_SEXUALLY_EXPLICIT`
- `HARM_CATEGORY_DANGEROUS_CONTENT`

**Blocking Thresholds:**
- `BLOCK_NONE`: No blocking
- `BLOCK_ONLY_HIGH`: Block only high severity content
- `BLOCK_MEDIUM_AND_ABOVE`: Block medium and high severity (recommended)
- `BLOCK_LOW_AND_ABOVE`: Block low, medium, and high severity (strictest)

**Use Cases:**
- Child-safe content generation
- Compliance with content policies
- Brand-appropriate responses
- Educational content filtering

### 8. JSON Mode (v0.6.0+)

Get structured JSON responses with schema validation:

```typescript
import type { ResponseSchema } from 'gemback';

// Basic JSON mode
const response = await client.generate('Generate a user profile with name, age, and email', {
  responseMimeType: 'application/json',
});

console.log(response.json);  // Parsed JSON object
console.log(response.text);  // Raw JSON string

// JSON mode with schema validation
const userSchema: ResponseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string' },
  },
  required: ['name', 'age', 'email'],
};

const response2 = await client.generate('Generate a user profile', {
  responseMimeType: 'application/json',
  responseSchema: userSchema,
});

// Type-safe usage
interface User {
  name: string;
  age: number;
  email: string;
}

const user = response2.json as User;
console.log(user.name, user.age, user.email);

// Array of objects
const productsSchema: ResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      price: { type: 'number' },
    },
    required: ['id', 'name', 'price'],
  },
};

const products = await client.generate('Generate 3 products', {
  responseMimeType: 'application/json',
  responseSchema: productsSchema,
});

// Complex nested structures
const blogPostSchema: ResponseSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    author: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'author'],
};
```

**Schema Types Supported:**
- `object`: Object with defined properties
- `array`: Array of items
- `string`, `number`, `boolean`, `null`: Primitive types

**Use Cases:**
- API response formatting
- Data extraction and structuring
- Type-safe API integration
- Structured content generation
- Database-ready outputs

---

## 🔧 API Reference

### `GemBack`

#### Constructor Options

```typescript
interface GemBackOptions {
  apiKey?: string;                   // Gemini API key (single key)
  apiKeys?: string[];                // Multiple API keys (multi-key mode)
  fallbackOrder?: GeminiModel[];     // Optional: Fallback order
  maxRetries?: number;               // Optional: Max retries (default: 2)
  timeout?: number;                  // Optional: Request timeout (default: 30000ms)
  retryDelay?: number;               // Optional: Initial retry delay (default: 1000ms)
  debug?: boolean;                   // Optional: Debug logging (default: false)
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  apiKeyRotationStrategy?: 'round-robin' | 'least-used'; // Key rotation strategy (default: round-robin)
  enableMonitoring?: boolean;        // Optional: Enable monitoring (default: false)
  enableRateLimitPrediction?: boolean; // Optional: Rate limit prediction warnings (default: false)
}
```

**Note:** Either `apiKey` or `apiKeys` must be provided.

#### Methods

##### `generate(prompt, options?)`

Generate text response

```typescript
const response = await client.generate('Hello!', {
  model: 'gemini-2.5-flash',  // Specify model
  temperature: 0.7,
  maxTokens: 1000,
  systemInstruction: 'You are a helpful assistant',  // v0.5.0+
  tools: [weatherFunction],  // v0.5.0+
  toolConfig: { functionCallingMode: 'auto' },  // v0.5.0+
  safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }],  // v0.6.0+
  responseMimeType: 'application/json',  // v0.6.0+
  responseSchema: { type: 'object', properties: { ... } }  // v0.6.0+
});
```

**GenerateOptions:**
```typescript
interface GenerateOptions {
  model?: GeminiModel;
  temperature?: number;           // 0.0 - 2.0
  maxTokens?: number;            // Max output tokens
  topP?: number;                 // 0.0 - 1.0
  topK?: number;                 // Top-K sampling
  systemInstruction?: string | Content;  // v0.5.0+: Control model behavior
  tools?: FunctionDeclaration[];         // v0.5.0+: Available functions
  toolConfig?: ToolConfig;               // v0.5.0+: Function calling config
  safetySettings?: SafetySetting[];      // v0.6.0+: Content filtering
  responseMimeType?: string;             // v0.6.0+: Response format (e.g., 'application/json')
  responseSchema?: ResponseSchema;       // v0.6.0+: JSON schema validation
}

interface ToolConfig {
  functionCallingMode?: 'auto' | 'any' | 'none';
  allowedFunctionNames?: string[];
}
```

##### `generateStream(prompt, options?)`

Generate streaming response

```typescript
const stream = client.generateStream('Tell me a story');
for await (const chunk of stream) {
  console.log(chunk.text);
}
```

##### `chat(messages, options?)`

Conversational interface

```typescript
const response = await client.chat([
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi! How can I help?' },
  { role: 'user', content: 'Tell me about TypeScript' }
]);
```

##### `getFallbackStats()`

Get fallback statistics

```typescript
const stats = client.getFallbackStats();
```

---

## ⚙️ Configuration

### Basic Configuration

```typescript
const client = new GemBack({
  apiKey: 'YOUR_KEY',

  // Specify models to use
  fallbackOrder: [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ],

  // Retry settings
  maxRetries: 3,
  retryDelay: 2000,

  // Timeout settings
  timeout: 60000,

  // Logging settings
  debug: true,
  logLevel: 'info'
});
```

### Advanced Configuration (v0.2.0)

```typescript
const client = new GemBack({
  // Multi-key rotation (v0.2.0+)
  apiKeys: ['KEY_1', 'KEY_2', 'KEY_3'],
  apiKeyRotationStrategy: 'least-used',  // or 'round-robin'

  // Monitoring & tracking (v0.2.0+)
  enableMonitoring: true,                // Enable monitoring
  enableRateLimitPrediction: true,       // Rate limit prediction warnings

  // Base settings
  fallbackOrder: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  maxRetries: 2,
  timeout: 30000,
  logLevel: 'info'
});
```

---

## 🔄 Fallback Behavior

### Error Handling Scenarios

| Error Type | Handling |
|-----------|-----------|
| **429 RPM Limit** | ⚡ Immediate fallback to next model |
| **5xx Server Error** | 🔄 Retry then fallback |
| **Timeout** | 🔄 Retry then fallback |
| **401/403 Auth Error** | ❌ Immediate failure (stop fallback) |
| **All Models Failed** | ❌ Return detailed error info |

### Retry Strategy

- **Exponential Backoff**: 1s → 2s → 4s → ...
- **Retryable Errors**: 5xx, Timeout, Network Error
- **Non-retryable Errors**: 4xx (except 429), Auth errors

---

## 📊 Logging Examples

### Basic Logging (`debug: true`)

```
[GemBack] Attempting: gemini-2.5-flash
[GemBack] Failed (429 RPM Limit): gemini-2.5-flash
[GemBack] Fallback to: gemini-2.5-flash-lite
[GemBack] Retry attempt 1/2: gemini-2.5-flash-lite
[GemBack] Success: gemini-2.5-flash-lite (2nd attempt)
```

### With Monitoring Enabled (`enableMonitoring: true`)

```
[GemBack] Monitoring enabled: Rate limit tracking and health monitoring
[GemBack] Attempting: gemini-2.5-flash (API Key #1)
[GemBack] Rate limit warning for gemini-2.5-flash: 12/15 RPM
[GemBack] Success: gemini-2.5-flash (1234ms)
```

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅ (Completed - v0.1.0)
- [x] Project structure
- [x] Basic fallback logic
- [x] 4 model support
- [x] TypeScript type definitions
- [x] Automatic retry with Exponential Backoff
- [x] Streaming response support
- [x] Conversational interface (chat)
- [x] Statistics tracking
- [x] Comprehensive test coverage (100 tests)
- [x] Complete documentation and examples

### Phase 2: Advanced Features ✅ (Completed - v0.2.0)

Phase 2 added advanced features to improve production stability.

#### 🔐 Multi-Key Support & Rotation ✅
- [x] **Load balancing with multiple API keys**
  - Automatic key rotation to bypass RPM limits
  - Support for round-robin and least-used strategies
  - Per-key usage tracking and statistics

#### 📊 Monitoring & Tracking ✅
- [x] **Rate Limit Tracking & Prediction**
  - Real-time usage tracking per model
  - Predictive warnings before hitting limits (80%, 90% thresholds)
  - Sliding window analysis (1-minute, 5-minute)

- [x] **Health Check & Model Status Monitoring**
  - Status monitoring per model (response time, success rate, availability)
  - Real-time health status (healthy/degraded/unhealthy)
  - Percentile-based performance metrics (p50, p95, p99)
  - Consecutive failure detection and tracking

**Phase 2 Achievements:**
- ✅ 165 comprehensive tests (65% increase from Phase 1)
- ✅ Production-level monitoring system
- ✅ Multi-key rotation for RPM limit bypass
- ✅ Real-time model health tracking

### Phase 2.5: Enhanced Content Generation ✅ (Completed - v0.5.0)

Phase 2.5 adds advanced content generation features from the Google GenAI SDK.

#### 🎯 System Instructions ✅
- [x] **Control model behavior and response style**
  - Guide model personality, tone, and output format
  - Support both string and structured Content format
  - Apply instructions across all generation methods
  - Maintain instructions through fallback chains

#### 🔧 Function Calling (Tool Use) ✅
- [x] **Enable AI to call external functions**
  - Define functions with structured parameters (JSON Schema)
  - Multiple function calling modes: auto, any, none
  - Restrict allowed functions with allowedFunctionNames
  - Extract function calls from model responses
  - Support multi-turn conversations with function results

**Phase 2.5 Achievements:**
- ✅ 191 comprehensive tests (16% increase from Phase 2)
- ✅ Full GenAI SDK compatibility for function calling types
- ✅ System instruction support in all generation methods
- ✅ Comprehensive examples for both features

### Phase 2.6: Safety & Structured Output ✅ (Completed - v0.6.0)

Phase 2.6 adds content safety controls and structured JSON output capabilities.

#### 🛡️ Safety Settings ✅
- [x] **Content filtering and moderation**
  - Configure safety thresholds for different harm categories
  - Support for harassment, hate speech, sexually explicit, and dangerous content filtering
  - Multiple blocking levels: none, low, medium, high
  - Child-safe content generation
  - Compliance with content policies

#### 📊 JSON Mode ✅
- [x] **Structured JSON responses**
  - Automatic JSON parsing with `response.json` field
  - Schema validation with OpenAPI-compatible schemas
  - Support for objects, arrays, and nested structures
  - Type-safe integration with TypeScript interfaces
  - Structured data extraction and API response formatting

**Phase 2.6 Achievements:**
- ✅ 216 comprehensive tests (13% increase from Phase 2.5)
- ✅ Full safety settings support with all harm categories
- ✅ JSON mode with schema validation
- ✅ Comprehensive examples for safety settings and JSON mode

### Phase 3: Performance & Ecosystem (Planned)

Phase 3 will focus on performance optimization and ecosystem expansion.

#### ⚡ Performance Optimization
- [ ] **Response Caching**
  - Reduce API calls with caching
  - TTL-based cache expiration
  - Memory-efficient cache strategy

- [ ] **Connection Pooling**
  - Improve performance with connection reuse
  - Optimize concurrent request handling
  - Efficient resource usage

#### 🛡️ Advanced Reliability Patterns
- [ ] **Circuit Breaker Pattern**
  - Temporary blocking on persistent failures
  - Automatic recovery and retry
  - System overload prevention

#### 🌐 Ecosystem Expansion
- [ ] CLI tools
- [ ] Web dashboard (real-time monitoring)
- [ ] Monitoring integration (Prometheus, Grafana)
- [ ] Additional AI model support (Claude, GPT, etc.)

---

## 🤝 Contributing

Contributions are welcome! You can participate by:

1. Reporting issues
2. Suggesting features
3. Submitting pull requests
4. Improving documentation

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - Free to use, modify, and distribute.

---

## 🔗 Links

- **Documentation**: [API Documentation](https://github.com/Laeyoung/gem-back/docs)
- **Issues**: [GitHub Issues](https://github.com/Laeyoung/gem-back/issues)
- **NPM**: [npm package](https://www.npmjs.com/package/gemback)
- **Gemini API**: [Google AI Gemini](https://ai.google.dev/docs)

---

## 💡 FAQ

### Q: Where can I get an API key?
A: Get a free API key at [Google AI Studio](https://makersuite.google.com/app/apikey).

### Q: What happens when all models fail?
A: Throws `GeminiBackError` with details of all attempts.

### Q: Can I use only specific models?
A: Yes, pass your preferred models in the `fallbackOrder` option.

### Q: What are the costs?
A: Only Gemini API costs apply. Gem Back is free and open-source.

---

<!-- PROJECTS_SHOWCASE_START -->
## 🌟 Projects Using Gem Back

**Be the first to showcase your project using Gem Back!**

If you're using Gem Back in your project, we'd love to feature it here.
Your project could be the first one listed!

*Updated: 2025-11-29*
<!-- PROJECTS_SHOWCASE_END -->

---

**Made with ❤️ by Laeyoung**
