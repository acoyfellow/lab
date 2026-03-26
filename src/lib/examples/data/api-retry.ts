import type { ChainStep } from '@acoyfellow/lab';

export const API_RETRY_STEPS: ChainStep[] = [
  {
    name: 'Attempt API Call',
    body: `// Configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(url, options = {}, attempt = 1) {
  try {
    // Attempt the fetch
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    
    return {
      success: true,
      attempt: attempt,
      data: await response.json()
    };
    
  } catch (error) {
    // Check if we should retry
    if (attempt >= MAX_RETRIES) {
      return {
        success: false,
        attempts: attempt,
        error: error.message,
        finalError: true
      };
    }
    
    // Calculate exponential backoff delay
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recursive retry
    return fetchWithRetry(url, options, attempt + 1);
  }
}

// Example: Call a potentially flaky API
const result = await fetchWithRetry('https://httpbin.org/status/200');

return result;`,
    capabilities: []
  },
  {
    name: 'Circuit Breaker Check',
    body: `// Simple circuit breaker implementation
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_TIMEOUT_MS = 30000;

// Check previous step result
const previousResult = input;

if (!previousResult.success) {
  // In a real implementation, you'd check KV for circuit state
  // For demo, we'll simulate circuit logic
  
  const circuitState = {
    failures: previousResult.attempts || 0,
    isOpen: previousResult.attempts >= 3,
    lastFailure: Date.now()
  };
  
  if (circuitState.isOpen) {
    return {
      action: 'circuit_open',
      message: 'Circuit breaker is OPEN - failing fast',
      fallback: 'Returning cached data or default response',
      retryAfter: '30 seconds'
    };
  }
}

return {
  action: 'circuit_closed',
  message: 'Request succeeded or circuit healthy',
  result: previousResult
};`,
    capabilities: []
  }
];

export const API_RETRY_DESCRIPTION = {
  id: 'api-retry',
  title: 'API Retry with Backoff',
  description: 'Handle flaky APIs with exponential backoff and circuit breaker pattern',
  problem: 'External APIs fail intermittently. Blind retries overwhelm failing services.',
  solution: 'Implement exponential backoff between retries. Track failures with circuit breaker.',
  result: 'Resilient API calls that fail gracefully and recover automatically',
  tags: ['api', 'resilience', 'retry', 'circuit-breaker'],
  icon: 'refresh-cw'
};
