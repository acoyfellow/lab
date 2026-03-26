/**
 * Canonical guest bodies for Worker isolates (template `guest@v1`).
 * Isolates execute plain JavaScript — TypeScript type annotations in bodies will throw at runtime.
 */
import type { ChainStep } from '@acoyfellow/lab';
import { CHAIN_STEPS_FOR_CURL } from './home-snippets';

/** Default two-step chain used in Compose, tutorial MiniChain, dogfood, README. */
export const SIMPLE_CHAIN_STEPS: ChainStep[] = [
	{ body: 'return [1, 2, 3]', capabilities: [] },
	{ body: 'return input.map((n) => n * 2)', capabilities: [] },
];

/** JSON Healer example: demonstrates automatic JSON repair with trace */
export const JSON_HEALER_STEPS: ChainStep[] = [
	{
		name: 'Load Broken JSON',
		body: `const brokenJson = '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob",}]}';
return { brokenJson, attempt: 1 };`,
		capabilities: []
	},
	{
		name: 'Parse Attempt',
		body: `try {
  const parsed = JSON.parse(input.brokenJson);
  return { success: true, data: parsed, attempts: input.attempt };
} catch (error) {
  return { 
    success: false, 
    error: error.message,
    brokenJson: input.brokenJson,
    attempt: input.attempt 
  };
}`,
		capabilities: []
	},
	{
		name: 'Auto-Heal',
		body: `if (input.success) {
  return input;
}
let fixed = input.brokenJson;
fixed = fixed.replace(/,(\\s*[}\\]])/g, '$1');
try {
  const parsed = JSON.parse(fixed);
  return {
    success: true,
    data: parsed,
    attempts: input.attempt,
    fixed: true,
    diagnosis: 'Removed trailing comma'
  };
} catch (secondError) {
  return {
    success: false,
    error: secondError.message,
    brokenJson: fixed,
    attempt: input.attempt + 1
  };
}`,
		capabilities: []
	},
	{
		name: 'Validate',
		body: `return {
  healed: input.success,
  attempts: input.attempts || 1,
  data: input.data,
  fixes_applied: input.diagnosis || 'None needed'
};`,
		capabilities: []
	}
];

export const API_RETRY_STEPS: ChainStep[] = [
	{
		name: 'Attempt API Call',
		body: `const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(url, options = {}, attempt = 1) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}\`);
    }
    
    return { success: true, attempt, data: await response.json() };
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      return { success: false, attempts: attempt, error: error.message };
    }
    
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, attempt + 1);
  }
}

return await fetchWithRetry('https://httpbin.org/get');`,
		capabilities: []
	},
	{
		name: 'Circuit Breaker Check',
		body: `const previousResult = input;

if (!previousResult.success) {
  return {
    action: 'circuit_check',
    failures: previousResult.attempts,
    circuitOpen: previousResult.attempts >= 3,
    message: previousResult.attempts >= 3 ? 'Circuit would OPEN - failing fast' : 'Retry exhausted'
  };
}

return { action: 'success', result: previousResult };`,
		capabilities: []
	}
];

export const WEBHOOK_VALIDATOR_STEPS: ChainStep[] = [
	{
		name: 'Verify Signature',
		body: `const WEBHOOK_SECRET = 'whsec_test_secret';
const PAYLOAD = JSON.stringify({ event: 'payment.success', id: 'evt_123' });

async function verifySignature(payload, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return 'sha256=' + Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

const computed = await verifySignature(PAYLOAD, WEBHOOK_SECRET);

return { verified: true, signature: computed, method: 'HMAC-SHA256' };`,
		capabilities: []
	},
	{
		name: 'Parse & Validate',
		body: `const payload = { event: 'payment.success', id: 'evt_123', data: { amount: 1000 } };

const errors = [];
if (!payload.event) errors.push('Missing event');
if (!payload.id?.startsWith('evt_')) errors.push('Invalid ID format');
if (typeof payload.data?.amount !== 'number') errors.push('Invalid amount');

return {
  valid: errors.length === 0,
  errors,
  event: payload.event,
  ready: errors.length === 0
};`,
		capabilities: []
	}
];

export function bodiesFromSteps(steps: readonly Pick<ChainStep, 'body' | 'code'>[]): string[] {
	return steps.map((s) => s.body ?? s.code ?? '');
}

export function allCanonicalGuestBodies(): string[] {
	return [
		...bodiesFromSteps(SIMPLE_CHAIN_STEPS),
		...bodiesFromSteps([...CHAIN_STEPS_FOR_CURL]),
		...bodiesFromSteps(API_RETRY_STEPS),
		...bodiesFromSteps(WEBHOOK_VALIDATOR_STEPS),
		'return { ok: true, sum: 1 + 2 }',
		'return input.map((n) => n * n)',
		'return await d1.query("SELECT id, note FROM lab_demo WHERE id = 1")',
		'return { hello: "world" }',
		'return { ok: true, value: 1 + 1 }',
		'return { piMessageCount: 4, via: "pi-lab-bridge" }',
		'return input.piMessageCount * 2',
	];
}