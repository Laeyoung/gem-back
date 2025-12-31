# Gem Back Examples

This directory contains example code demonstrating various features of Gem Back.

## Prerequisites

1. Install Gem Back:
   ```bash
   npm install gemback
   ```

2. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

3. Set your API key as an environment variable:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

## Examples

### 1. Basic Usage (`basic-usage.ts`)

The simplest way to use Gem Back. Shows how to:
- Create a client
- Make a text generation request
- View response and statistics

**Run:**
```bash
npx tsx examples/basic-usage.ts
```

### 2. Custom Fallback (`custom-fallback.ts`)

Configure custom fallback behavior. Shows how to:
- Set custom fallback order
- Adjust retry settings
- Control timeout and delays
- Enable debug logging

**Run:**
```bash
npx tsx examples/custom-fallback.ts
```

### 3. Streaming (`streaming.ts`)

Use streaming for real-time responses. Shows how to:
- Stream responses chunk by chunk
- Display text as it's generated
- Handle stream completion

**Run:**
```bash
npx tsx examples/streaming.ts
```

### 4. Error Handling (`error-handling.ts`)

Handle different error scenarios. Shows how to:
- Catch and handle GeminiBackError
- Inspect error details and attempt history
- Implement graceful degradation
- Provide fallback responses

**Run:**
```bash
npx tsx examples/error-handling.ts
```

### 5. Advanced Configuration (`advanced-config.ts`)

Advanced usage patterns. Shows how to:
- Use chat conversations
- Monitor statistics across multiple requests
- Configure logging levels
- Fine-tune generation parameters

**Run:**
```bash
npx tsx examples/advanced-config.ts
```

### 6. Multi-Key Example (`multi-key-example.ts`)

Multi-key rotation for bypassing rate limits. Shows how to:
- Configure multiple API keys
- Use round-robin and least-used strategies
- Track per-key statistics
- Scale beyond single-key RPM limits

**Run:**
```bash
npx tsx examples/multi-key-example.ts
```

### 7. Monitoring Example (`monitoring-example.ts`)

Real-time monitoring and health tracking. Shows how to:
- Enable rate limit tracking
- Get predictive warnings before hitting limits
- Monitor model health status
- View percentile response time metrics

**Run:**
```bash
npx tsx examples/monitoring-example.ts
```

### 8. Multimodal (`multimodal.ts`)

Use images and files with text. Shows how to:
- Send images with prompts (base64 encoded)
- Use file URIs for large media
- Combine text and visual inputs
- Handle multimodal responses

**Run:**
```bash
npx tsx examples/multimodal.ts
```

### 9. System Instructions (`system-instructions.ts`) - v0.5.0+

Control model behavior and response style. Shows how to:
- Guide model personality and tone
- Use string and structured Content formats
- Apply instructions across all methods
- Create role-based assistants

**Run:**
```bash
npx tsx examples/system-instructions.ts
```

### 10. Function Calling (`function-calling.ts`) - v0.5.0+

Enable AI to call external functions. Shows how to:
- Define functions with JSON Schema parameters
- Use different calling modes (auto, any, none)
- Restrict allowed functions
- Handle multi-turn conversations with function results
- Build AI agents with tool access

**Run:**
```bash
npx tsx examples/function-calling.ts
```

### 11. Safety Settings (`safety-settings.ts`) - v0.6.0+

Configure content filtering and moderation. Shows how to:
- Set safety thresholds for different harm categories
- Use strict filtering for children's content
- Apply permissive filtering for adult content
- Combine safety settings with other options
- Handle content blocked by safety filters

**Run:**
```bash
npx tsx examples/safety-settings.ts
```

### 12. JSON Mode (`json-mode.ts`) - v0.6.0+

Get structured JSON responses with schema validation. Shows how to:
- Enable basic JSON mode
- Validate with schemas
- Generate arrays of objects
- Use complex nested structures
- Type-safe integration with TypeScript interfaces
- Data extraction and API response formatting

**Run:**
```bash
npx tsx examples/json-mode.ts
```

## Running Examples

### With tsx (recommended)

```bash
# Install tsx globally
npm install -g tsx

# Run any example
tsx examples/basic-usage.ts
```

### With ts-node

```bash
# Install ts-node
npm install -g ts-node

# Run any example
ts-node examples/basic-usage.ts
```

### Compile and run

```bash
# Compile TypeScript
npx tsc examples/basic-usage.ts --outDir dist/examples

# Run compiled JavaScript
node dist/examples/basic-usage.js
```

## Example Output

```
$ tsx examples/basic-usage.ts

Generating response...

Response: TypeScript is a strongly typed superset of JavaScript that adds static
type definitions. It helps catch errors early in development and improves code
maintainability.

Model used: gemini-2.5-flash

Token usage:
  Prompt tokens: 12
  Completion tokens: 34
  Total tokens: 46

Client statistics:
  Total requests: 1
  Success rate: 100.00%
  Model usage: { 'gemini-2.5-flash': 1, ... }
```

## Tips

- Always use environment variables for API keys (never hardcode them)
- Start with `basic-usage.ts` to verify your setup
- Enable `debug: true` when troubleshooting
- Check statistics to monitor model usage and success rates

## Need Help?

- Check the [main README](../README.md) for detailed documentation
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines
- Open an issue on [GitHub](https://github.com/Laeyoung/gem-back/issues)
