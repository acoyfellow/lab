import type { ChainStep } from '@acoyfellow/lab';

export const API_RETRY_STEPS: ChainStep[] = [
  {
    name: 'Simulate API Call with Retry Logic',
    body: `// Configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Simulated flaky API - randomly fails to demonstrate retry
function simulateFlakyApi(attempt) {
  // Simulate: 70% success rate, fails on attempts 1 and 2 sometimes
  const shouldFail = Math.random() > 0.7 && attempt < 3;
  
  if (shouldFail) {
    throw new Error(\`Simulated network error on attempt \${attempt}\`);
  }
  
  return {
    status: 200,
    data: { 
      users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      timestamp: Date.now(),
      attempt: attempt
    }
  };
}

async function callWithRetry(operation, attempt = 1) {
  try {
    // Attempt the operation
    const result = await operation(attempt);
    
    return {
      success: true,
      attempt: attempt,
      data: result.data
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
    
    // Wait before retrying (using setTimeout in isolate)
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recursive retry
    return callWithRetry(operation, attempt + 1);
  }
}

// Execute the retry logic against simulated flaky API
const result = await callWithRetry(simulateFlakyApi);

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
  // Circuit breaker logic
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
      retryAfter: '30 seconds',
      circuitState
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
