/**
 * Monitoring & Tracking Example
 *
 * This example demonstrates how to use the monitoring features to track
 * rate limits and model health in real-time.
 */

import { GemBack } from '../src';

// Example 1: Basic Monitoring
async function basicMonitoring() {
  console.log('\n=== Example 1: Basic Monitoring ===\n');

  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'demo-key',
    enableMonitoring: true,  // Enable monitoring
  });

  // Make some requests
  for (let i = 0; i < 5; i++) {
    try {
      await client.generate(`Request ${i + 1}: What is ${i + 1} + ${i + 1}?`);
      console.log(`Request ${i + 1} completed`);
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error);
    }
  }

  // Get monitoring stats
  const stats = client.getFallbackStats();

  console.log('\n--- Monitoring Statistics ---');
  console.log('Overall success rate:', (stats.successRate * 100).toFixed(2) + '%');
  console.log('Total requests:', stats.totalRequests);

  if (stats.monitoring) {
    console.log('\n--- Rate Limit Status ---');
    stats.monitoring.rateLimitStatus?.forEach(status => {
      console.log(`\nModel: ${status.model}`);
      console.log(`  Current RPM: ${status.currentRPM}/${status.maxRPM}`);
      console.log(`  Utilization: ${status.utilizationPercent.toFixed(1)}%`);
      console.log(`  Near limit: ${status.isNearLimit ? 'YES ⚠️' : 'No'}`);
      console.log(`  Will exceed soon: ${status.willExceedSoon ? 'YES 🚨' : 'No'}`);
    });

    console.log('\n--- Model Health ---');
    stats.monitoring.modelHealth?.forEach(health => {
      console.log(`\nModel: ${health.model}`);
      console.log(`  Status: ${health.status.toUpperCase()} ${getStatusIcon(health.status)}`);
      console.log(`  Success Rate: ${(health.successRate * 100).toFixed(1)}%`);
      console.log(`  Avg Response Time: ${health.averageResponseTime.toFixed(0)}ms`);
      console.log(`  Availability: ${(health.availability * 100).toFixed(1)}%`);
      console.log(`  Consecutive Failures: ${health.consecutiveFailures}`);

      if (health.metrics.totalRequests > 0) {
        console.log('  Metrics:');
        console.log(`    Total Requests: ${health.metrics.totalRequests}`);
        console.log(`    Successful: ${health.metrics.successfulRequests}`);
        console.log(`    Failed: ${health.metrics.failedRequests}`);
        console.log(`    p50: ${health.metrics.p50ResponseTime}ms`);
        console.log(`    p95: ${health.metrics.p95ResponseTime}ms`);
        console.log(`    p99: ${health.metrics.p99ResponseTime}ms`);
      }
    });

    console.log('\n--- Summary ---');
    const summary = stats.monitoring.summary;
    if (summary) {
      console.log(`Healthy Models: ${summary.healthyModels}`);
      console.log(`Degraded Models: ${summary.degradedModels}`);
      console.log(`Unhealthy Models: ${summary.unhealthyModels}`);
      console.log(`Overall Success Rate: ${(summary.overallSuccessRate * 100).toFixed(1)}%`);
      console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(0)}ms`);
    }
  }
}

// Example 2: Rate Limit Tracking with Multiple Requests
async function rateLimitTracking() {
  console.log('\n=== Example 2: Rate Limit Tracking ===\n');

  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'demo-key',
    enableMonitoring: true,
  });

  console.log('Making 10 rapid requests to trigger rate limit warnings...\n');

  for (let i = 0; i < 10; i++) {
    try {
      await client.generate(`Quick request ${i + 1}`);

      // Check rate limit status after each request
      const stats = client.getFallbackStats();
      const flashStatus = stats.monitoring?.rateLimitStatus?.find(
        s => s.model === 'gemini-2.5-flash'
      );

      if (flashStatus) {
        console.log(
          `[${i + 1}] RPM: ${flashStatus.currentRPM}/${flashStatus.maxRPM} ` +
          `(${flashStatus.utilizationPercent.toFixed(1)}%) ` +
          `${flashStatus.isNearLimit ? '⚠️  NEAR LIMIT' : ''} ` +
          `${flashStatus.willExceedSoon ? '🚨 WILL EXCEED' : ''}`
        );
      }
    } catch (error) {
      console.error(`Request ${i + 1} failed`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Example 3: Monitoring with Multi-Key Rotation
async function multiKeyMonitoring() {
  console.log('\n=== Example 3: Multi-Key with Monitoring ===\n');

  const client = new GemBack({
    apiKeys: [
      process.env.GEMINI_API_KEY_1 || 'demo-key-1',
      process.env.GEMINI_API_KEY_2 || 'demo-key-2',
      process.env.GEMINI_API_KEY_3 || 'demo-key-3',
    ],
    apiKeyRotationStrategy: 'round-robin',
    enableMonitoring: true,
  });

  console.log('Making 15 requests with 3 API keys...\n');

  for (let i = 0; i < 15; i++) {
    try {
      await client.generate(`Multi-key request ${i + 1}`);
    } catch (error) {
      console.error(`Request ${i + 1} failed`);
    }
  }

  const stats = client.getFallbackStats();

  console.log('\n--- API Key Statistics ---');
  stats.apiKeyStats?.forEach((keyStat, index) => {
    console.log(`\nAPI Key #${index + 1}:`);
    console.log(`  Total Requests: ${keyStat.totalRequests}`);
    console.log(`  Success Count: ${keyStat.successCount}`);
    console.log(`  Failure Count: ${keyStat.failureCount}`);
    console.log(`  Success Rate: ${(keyStat.successRate * 100).toFixed(1)}%`);
    console.log(`  Last Used: ${keyStat.lastUsed?.toISOString() || 'Never'}`);
  });

  console.log('\n--- Overall Rate Limit Status ---');
  const flashStatus = stats.monitoring?.rateLimitStatus?.find(
    s => s.model === 'gemini-2.5-flash'
  );
  if (flashStatus) {
    console.log(`Current RPM: ${flashStatus.currentRPM}/${flashStatus.maxRPM}`);
    console.log(`Requests in last minute: ${flashStatus.windowStats.requestsInLastMinute}`);
    console.log(`Requests in last 5 minutes: ${flashStatus.windowStats.requestsInLast5Minutes}`);
    console.log(`Average RPM: ${flashStatus.windowStats.averageRPM.toFixed(1)}`);
  }
}

// Example 4: Health Status Monitoring Over Time
async function healthStatusMonitoring() {
  console.log('\n=== Example 4: Health Status Monitoring ===\n');

  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'demo-key',
    enableMonitoring: true,
  });

  console.log('Making requests and monitoring health status...\n');

  // Simulate requests over time
  for (let batch = 0; batch < 3; batch++) {
    console.log(`\n--- Batch ${batch + 1} ---`);

    // Make 5 requests per batch
    for (let i = 0; i < 5; i++) {
      try {
        await client.generate(`Batch ${batch + 1}, Request ${i + 1}`);
      } catch (error) {
        // Ignore errors for demo
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check health after each batch
    const stats = client.getFallbackStats();
    const flashHealth = stats.monitoring?.modelHealth?.find(
      h => h.model === 'gemini-2.5-flash'
    );

    if (flashHealth) {
      console.log(`\nModel Health: ${flashHealth.status.toUpperCase()} ${getStatusIcon(flashHealth.status)}`);
      console.log(`  Success Rate: ${(flashHealth.successRate * 100).toFixed(1)}%`);
      console.log(`  Avg Response Time: ${flashHealth.averageResponseTime.toFixed(0)}ms`);
      console.log(`  Consecutive Failures: ${flashHealth.consecutiveFailures}`);
      console.log(`  Total Requests: ${flashHealth.metrics.totalRequests}`);
    }
  }
}

// Example 5: Custom Monitoring Dashboard
async function monitoringDashboard() {
  console.log('\n=== Example 5: Monitoring Dashboard ===\n');

  const client = new GemBack({
    apiKey: process.env.GEMINI_API_KEY || 'demo-key',
    enableMonitoring: true,
  });

  // Function to display dashboard
  function displayDashboard(stats: ReturnType<typeof client.getFallbackStats>) {
    console.clear();
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║          GEMINI BACK - MONITORING DASHBOARD              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Overall Stats:`);
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`   Failures: ${stats.failureCount}\n`);

    if (stats.monitoring?.summary) {
      const summary = stats.monitoring.summary;
      console.log(`🏥 Model Health Summary:`);
      console.log(`   Healthy: ${summary.healthyModels} ✅`);
      console.log(`   Degraded: ${summary.degradedModels} ⚠️`);
      console.log(`   Unhealthy: ${summary.unhealthyModels} 🚨`);
      console.log(`   Overall Success: ${(summary.overallSuccessRate * 100).toFixed(1)}%`);
      console.log(`   Avg Response: ${summary.averageResponseTime.toFixed(0)}ms\n`);
    }

    console.log(`📈 Rate Limits:`);
    stats.monitoring?.rateLimitStatus?.forEach(status => {
      if (status.currentRPM > 0) {
        const bar = '█'.repeat(Math.floor(status.utilizationPercent / 5));
        const empty = '░'.repeat(20 - Math.floor(status.utilizationPercent / 5));
        console.log(`   ${status.model}:`);
        console.log(`   ${bar}${empty} ${status.currentRPM}/${status.maxRPM} (${status.utilizationPercent.toFixed(0)}%)`);
      }
    });

    console.log('\n' + '─'.repeat(60));
  }

  // Simulate continuous monitoring
  console.log('Starting monitoring dashboard (updating every 2 seconds)...\n');
  console.log('Press Ctrl+C to exit\n');

  let requestCount = 0;
  const interval = setInterval(async () => {
    // Make a request
    try {
      await client.generate(`Dashboard request ${++requestCount}`);
    } catch (error) {
      // Ignore
    }

    // Update dashboard
    const stats = client.getFallbackStats();
    displayDashboard(stats);

    // Stop after 10 requests for demo
    if (requestCount >= 10) {
      clearInterval(interval);
      console.log('\n✅ Dashboard demo completed');
    }
  }, 2000);
}

// Helper function to get status icon
function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'unhealthy':
      return '🚨';
    default:
      return '❓';
  }
}

// Run examples
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     GEMINI BACK - MONITORING & TRACKING EXAMPLES         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await basicMonitoring();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await rateLimitTracking();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await multiKeyMonitoring();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await healthStatusMonitoring();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Uncomment to run the dashboard (interactive)
    // await monitoringDashboard();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
