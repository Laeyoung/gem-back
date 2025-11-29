# Reddit Post Draft - Side Project Subreddit

## 💎 Gem Back - Built a fallback/monitoring system for Google Gemini API (saves you from rate limit headaches)

Hey everyone! I just released v0.2.1 of my side project and wanted to share it here.

**The Problem:**

I was building an app with Google's Gemini API (free tier) and kept hitting the dreaded 429 "Too Many Requests" errors. The RPM limits are pretty strict, and my app would just... stop working. Manually handling fallbacks and retries was getting messy fast.

**The Solution:**

So I built **Gem Back** - an NPM library that automatically handles:
- ✅ **Smart fallback** across 4 Gemini models (2.5-flash → 2.5-flash-lite → 2.0-flash → 2.0-flash-lite)
- ✅ **Multi-key rotation** to bypass RPM limits (just throw in multiple API keys)
- ✅ **Real-time monitoring** with rate limit tracking and health checks
- ✅ **Auto-retry** with exponential backoff for transient errors
- ✅ **Streaming support** and conversational chat interface

**Quick Example:**

```typescript
import { GemBack } from 'gemback';

const client = new GemBack({
  apiKeys: ['KEY_1', 'KEY_2', 'KEY_3'], // Rotates through keys
  enableMonitoring: true
});

const response = await client.generate('Hello!');
// Automatically handles fallback if one model/key fails
```

**Tech Stack:**
- TypeScript (fully typed)
- Node.js 18+
- Vitest (165 comprehensive tests)
- Dual module support (CommonJS + ESM)

**What's Next:**
Working on Phase 3 which includes response caching, circuit breaker patterns, and maybe a web dashboard for real-time monitoring.

**Links:**
- NPM: https://www.npmjs.com/package/gemback
- GitHub: https://github.com/Laeyoung/gem-back
- MIT License, free to use

Would love to hear your feedback! Has anyone else dealt with API rate limiting in creative ways? How do you handle it?

---

## Notes for Posting

**Subreddit Guidelines:**
- r/SideProject - Share your side projects
- Tag appropriately (e.g., [Launch], [Feedback])
- Engage with comments within first few hours

**Optional Additions:**
- Personal story: Why you built this, what challenges you faced
- Development time: How long it took
- Learning experiences: What you learned along the way
- Future plans: What features you're excited about

**Engagement Tips:**
- Respond to comments quickly
- Be humble and open to feedback
- Share technical details if people ask
- Consider cross-posting to r/typescript, r/node, or r/webdev
