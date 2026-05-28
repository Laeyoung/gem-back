# SDK Migration Monitoring Guide

Post-migration monitoring checklist for the first week after deploying `@google/genai` SDK.

## 📊 Daily Monitoring Checklist (First Week)

### Day 1: Deployment Day

- [ ] **Deployment Verification**
  - [ ] Successful build and deployment
  - [ ] All health checks passing
  - [ ] No immediate errors in logs

- [ ] **Initial Traffic (First Hour)**
  - [ ] Monitor error rate (expect <0.1% baseline)
  - [ ] Check response times (expect ±10% of baseline)
  - [ ] Verify first successful requests
  - [ ] Review first 100 requests for anomalies

- [ ] **Performance Baseline**
  - [ ] Record average response time: ____ms
  - [ ] Record p95 response time: ____ms
  - [ ] Record p99 response time: ____ms
  - [ ] Record error rate: ____%

- [ ] **Client Caching Metrics**
  - [ ] Verify cache hit ratio (expect >80% after warmup)
  - [ ] Monitor cache memory usage
  - [ ] Check for any cache-related errors

### Day 2-3: Stability Period

- [ ] **Error Analysis**
  - [ ] Review all error logs for SDK-related issues
  - [ ] Check for any new error patterns
  - [ ] Verify error rates remain stable

- [ ] **Performance Trending**
  - [ ] Compare response times to Day 1 baseline
  - [ ] Identify any degradation or improvement
  - [ ] Document any anomalies

- [ ] **Feature Verification**
  - [ ] Test all main features in production:
    - [ ] Basic text generation
    - [ ] Streaming responses
    - [ ] Multimodal content
    - [ ] Multi-key rotation (if enabled)
    - [ ] Rate limit handling
    - [ ] Fallback chain

### Day 4-7: Pattern Recognition

- [ ] **Weekly Summary Analysis**
  - [ ] Total requests processed: ______
  - [ ] Success rate: ____%
  - [ ] Average response time: ____ms
  - [ ] Total errors: ______
  - [ ] Cache hit ratio: ____%

- [ ] **Edge Case Review**
  - [ ] Document any unusual patterns
  - [ ] Review failed requests for commonalities
  - [ ] Check for specific model failures

## 🔍 Key Metrics to Monitor

### TPM (Tokens Per Minute) — v0.7.0+

Free-tier Gemini models cap at **250K tokens/minute** in addition to RPM. `RateLimitTracker` records token usage via `recordTokens()` (called automatically by `FallbackClient` after each non-streaming `generate()` and `generateContent()` resolves), and `RateLimitStatus` surfaces three new fields:

```ts
const status = tracker.getStatus('gemini-3.5-flash');
status.currentTPM            // number   — tokens consumed in last 60s
status.maxTPM                // number   — 250_000 for free-tier models
status.tpmUtilizationPercent // number   — currentTPM / maxTPM * 100
```

For paid-tier models (`gemini-2.5-pro`, `gemini-2.0-flash`, etc.) all three are `undefined` — `RateLimitTracker` only tracks TPM when `RateLimitConfig.tpm` is set.

`willExceedSoon` now takes whichever of RPM/TPM is closer to its limit (>=90% utilization). A workload generating long completions can trip the TPM ceiling well before exhausting RPM — visible in logs as:

```
Rate limit warning for gemini-3.5-flash: <currentRPM>/5 RPM
```

with `status.tpmUtilizationPercent` >= 90 even when RPM is low.

**Streaming caveat**: `generateStream()` and `generateContentStream()` do **not** call `recordTokens()` (per-chunk usage is unavailable). Streaming workloads should still expect TPM enforcement from the API itself but won't see local predictions.

### Error Metrics

```
Target Thresholds:
- Overall Error Rate: <0.1%
- SDK-Related Errors: 0
- Authentication Errors: 0 (unless actual auth issues)
- Rate Limit Errors: <0.05% (depends on usage)
```

**What to Look For:**
- Sudden spikes in error rate
- New error types not seen before
- Patterns in error timing (specific hours, days)
- Errors related to specific models

**Alert Triggers:**
- Error rate >1% for >5 minutes
- Any errors containing "GoogleGenAI", "@google/genai", or SDK-related stack traces
- Sudden increase in timeout errors

### Performance Metrics

```
Target Ranges (compared to pre-migration baseline):
- Average Response Time: ±10%
- P95 Response Time: ±15%
- P99 Response Time: ±20%
- Throughput: ≥95% of baseline
```

**What to Look For:**
- Gradual degradation over time
- Sudden performance drops
- Response time spikes during peak hours
- Memory leaks (increasing memory usage over time)

**Alert Triggers:**
- Average response time >20% slower than baseline
- P99 >3 seconds (was ~2s before)
- Memory usage increasing >10% per hour

### SDK-Specific Metrics

```
Client Caching:
- Cache Hit Ratio: >80% (after 1 hour warmup)
- Cache Size: <100 entries (typical)
- Cache Memory: <5MB

API Calls:
- generateContent() success rate: >99.9%
- generateContentStream() success rate: >99.9%
- No "text is undefined" errors
```

**What to Look For:**
- Low cache hit ratio (<50%)
- Unbounded cache growth
- Failures in response text extraction
- Streaming interruptions

## 🚨 Critical Issues to Watch

### Priority 1: Breaking Issues (Fix Immediately)

**Symptoms:**
- ❌ Error rate >5%
- ❌ Complete service outage
- ❌ All requests failing to specific model
- ❌ Memory leak causing crashes

**Action:**
1. Roll back to previous version immediately
2. Review error logs for root cause
3. Contact team for emergency fix
4. Document incident for post-mortem

### Priority 2: Degradation Issues (Fix Within 24h)

**Symptoms:**
- ⚠️ Error rate 1-5%
- ⚠️ Response time >50% slower
- ⚠️ Intermittent failures
- ⚠️ Cache not working properly

**Action:**
1. Investigate root cause
2. Check if issue is environment-specific
3. Review recent code changes
4. Prepare hot-fix if needed
5. Monitor closely for escalation

### Priority 3: Minor Issues (Fix Within Week)

**Symptoms:**
- ⚡ Error rate 0.1-1%
- ⚡ Response time 10-50% slower
- ⚡ Edge case failures
- ⚡ Suboptimal cache performance

**Action:**
1. Log detailed information
2. Create bug report
3. Schedule fix in next release
4. Add to known issues list

## 📝 Known Edge Cases to Monitor

### 1. Response Text Extraction
**Issue:** `result.text` might be `undefined` in rare cases
**Symptom:** Empty response text, "cannot read property 'text'" errors
**Monitor:** Error logs for text-related errors
**Mitigation:** Fallback to empty string (`??` operator already in place)

### 2. Streaming Chunk Handling
**Issue:** Streaming chunks might not have text property
**Symptom:** Missing chunks, incomplete responses
**Monitor:** Streaming response completeness
**Mitigation:** Skip chunks with empty text (already implemented)

### 3. Client Cache Memory
**Issue:** Unbounded cache growth with many unique API keys
**Symptom:** Increasing memory usage over time
**Monitor:** Process memory usage, cache size
**Mitigation:** Call `clearCache()` periodically if needed

### 4. Multi-Key Rotation
**Issue:** Some keys might be invalid or rate-limited
**Symptom:** Higher error rate, fallback to fewer keys
**Monitor:** Per-key error rates in statistics
**Mitigation:** Remove invalid keys from rotation

### 5. Model-Specific Failures
**Issue:** Specific Gemini model might be unavailable
**Symptom:** Failures for one model, success for others
**Monitor:** Model usage statistics, model health
**Mitigation:** Verify fallback chain is working

## 📈 Metrics Collection Examples

### Application Logs

```typescript
// Log SDK-related events
logger.info('SDK Migration - Request completed', {
  model: response.model,
  responseTime: duration,
  cacheHit: wasCacheHit,
  tokenUsage: response.usage?.totalTokens,
  success: true
});

logger.error('SDK Migration - Request failed', {
  model: attemptedModel,
  error: error.message,
  stack: error.stack,
  apiKey: apiKeyIndex, // Don't log actual key
});
```

### Daily Summary Script

```bash
#!/bin/bash
# Daily migration metrics summary

echo "=== SDK Migration Daily Summary ==="
echo "Date: $(date)"
echo ""

echo "Total Requests:"
grep "Request completed" app.log | wc -l

echo "Total Errors:"
grep "Request failed" app.log | wc -l

echo "Error Rate:"
# Calculate and display error percentage

echo "Average Response Time:"
# Extract and calculate average from logs

echo "Cache Hit Ratio:"
grep "cacheHit: true" app.log | wc -l
# Calculate percentage
```

### Health Check Endpoint

```typescript
// Add migration health check
app.get('/health/sdk-migration', async (req, res) => {
  const client = new GeminiClient();

  try {
    // Quick health check with cached client
    const start = Date.now();
    await client.generate('ping', 'gemini-2.5-flash', apiKey);
    const duration = Date.now() - start;

    res.json({
      status: 'healthy',
      sdk: '@google/genai@1.33.0',
      responseTime: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## 🎯 Success Criteria (End of Week 1)

### Required ✅
- [ ] **Error rate ≤ 0.1%** (same or better than pre-migration)
- [ ] **Response time within ±10%** of baseline
- [ ] **Zero SDK-related critical bugs**
- [ ] **All core features working** (generate, stream, multimodal)
- [ ] **No rollbacks required**

### Desired 🎯
- [ ] **Error rate improved** (lower than pre-migration)
- [ ] **Response time improved** (5-10ms faster due to caching)
- [ ] **Cache hit ratio >80%**
- [ ] **No performance degradation** under peak load
- [ ] **Positive team feedback** on stability

### Bonus 🌟
- [ ] **10%+ performance improvement** due to caching
- [ ] **Reduced memory usage** (more efficient SDK)
- [ ] **Zero edge cases encountered**
- [ ] **Documentation updated** with learnings

## 📞 Escalation Path

### Minor Issues
1. Document in issue tracker
2. Monitor for escalation
3. Schedule fix in next sprint

### Moderate Issues
1. Notify team lead
2. Create hot-fix plan
3. Deploy within 24 hours

### Critical Issues
1. **Immediate rollback** to previous version
2. Page on-call engineer
3. Start incident response
4. Root cause analysis
5. Post-mortem document

## 📚 Useful Commands

```bash
# Check error logs for SDK issues
grep -i "genai\|GoogleGenAI" app.log | tail -100

# Count errors by type
grep "error" app.log | cut -d':' -f2 | sort | uniq -c | sort -rn

# Monitor response times
grep "responseTime" app.log | awk '{sum+=$NF; count++} END {print sum/count}'

# Check cache hit ratio
echo "Cache Hits: $(grep 'cacheHit: true' app.log | wc -l)"
echo "Cache Misses: $(grep 'cacheHit: false' app.log | wc -l)"

# Live monitoring (real-time)
tail -f app.log | grep -i "SDK Migration"
```

## 🔄 Weekly Review Template

```markdown
# SDK Migration Week 1 Review

**Migration Date:** YYYY-MM-DD
**Review Date:** YYYY-MM-DD
**Status:** ✅ Success / ⚠️ Issues / ❌ Rollback

## Metrics Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Error Rate | <0.1% | __% | ✅/⚠️/❌ |
| Avg Response Time | ±10% baseline | __ms | ✅/⚠️/❌ |
| P95 Response Time | ±15% baseline | __ms | ✅/⚠️/❌ |
| Cache Hit Ratio | >80% | __% | ✅/⚠️/❌ |
| Uptime | 100% | __% | ✅/⚠️/❌ |

## Issues Encountered

1. **[Issue Title]**
   - Severity: Critical/High/Medium/Low
   - Impact: [Description]
   - Resolution: [How it was fixed]
   - Status: Resolved/In Progress/Deferred

## Lessons Learned

- [What went well]
- [What could be improved]
- [Action items for future migrations]

## Recommendations

- [ ] Continue monitoring for another week
- [ ] Migration successful, close monitoring ticket
- [ ] Address outstanding issues before full sign-off
- [ ] Consider rollback if issues persist

**Sign-off:** [Name] - [Date]
```

---

**Remember:** The first week is critical for catching edge cases. Better to be overly cautious than to miss a critical issue. When in doubt, escalate!
