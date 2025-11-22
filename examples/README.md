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
