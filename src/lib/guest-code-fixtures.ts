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
		...bodiesFromSteps(DATA_TRANSFORMER_STEPS),
		...bodiesFromSteps(MULTI_SOURCE_AGGREGATOR_STEPS),
		'return { ok: true, sum: 1 + 2 }',
		'return input.map((n) => n * n)',
		'return await d1.query("SELECT id, note FROM lab_demo WHERE id = 1")',
		'return { hello: "world" }',
		'return { ok: true, value: 1 + 1 }',
		'return { piMessageCount: 4, via: "pi-lab-bridge" }',
		'return input.piMessageCount * 2',
	];
}
export const DATA_TRANSFORMER_STEPS: ChainStep[] = [
	{
		name: 'Detect Format',
		body: `const input = '{"name": "John", "age": "30", "active": "true"}';

function detectFormat(data) {
  try {
    JSON.parse(data);
    return { format: 'json', data };
  } catch {
    if (data.includes(',') && data.includes('\n')) {
      return { format: 'csv', data };
    }
    return { format: 'unknown', data };
  }
}

return detectFormat(input);`,
		capabilities: []
	},
	{
		name: 'Parse & Normalize',
		body: `const detected = input;

if (detected.format === 'json') {
  const parsed = JSON.parse(detected.data);
  return {
    normalized: {
      name: String(parsed.name || ''),
      age: Number(parsed.age) || 0,
      active: parsed.active === 'true' || parsed.active === true
    },
    originalFormat: 'json'
  };
}

return { error: 'Unsupported format', format: detected.format };`,
		capabilities: []
	},
	{
		name: 'Validate Schema',
		body: `const data = input.normalized;
const errors = [];

if (!data.name || data.name.length < 2) {
  errors.push('Name must be at least 2 characters');
}

if (typeof data.age !== 'number' || data.age < 0 || data.age > 150) {
  errors.push('Age must be a number between 0 and 150');
}

if (typeof data.active !== 'boolean') {
  errors.push('Active must be a boolean');
}

return {
  valid: errors.length === 0,
  errors,
  data,
  ready: errors.length === 0
};`,
		capabilities: []
	},
	{
		name: 'Transform Output',
		body: `if (!input.valid) {
  return { error: 'Validation failed', details: input.errors };
}

const data = input.data;

return {
  transformed: {
    fullName: data.name.toUpperCase(),
    birthYear: new Date().getFullYear() - data.age,
    status: data.active ? 'active' : 'inactive',
    metadata: {
      processedAt: new Date().toISOString(),
      version: '1.0'
    }
  },
  transformationsApplied: ['uppercase', 'birthYearCalc', 'statusMapping']
};`,
		capabilities: []
	}
];

export const MULTI_SOURCE_AGGREGATOR_STEPS: ChainStep[] = [
	{
		name: 'Fetch Source A',
		body: `async function fetchSourceA() {
  return {
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    source: 'api-a',
    fetchedAt: Date.now()
  };
}

return await fetchSourceA();`,
		capabilities: []
	},
	{
		name: 'Fetch Source B',
		body: `async function fetchSourceB() {
  return {
    orders: [
      { userId: 1, total: 100, items: 2 },
      { userId: 1, total: 50, items: 1 },
      { userId: 2, total: 200, items: 3 }
    ],
    source: 'api-b',
    fetchedAt: Date.now()
  };
}

const sourceA = input;
const sourceB = await fetchSourceB();

return { sourceA, sourceB };`,
		capabilities: []
	},
	{
		name: 'Merge & Aggregate',
		body: `const { sourceA, sourceB } = input;

const userMap = new Map();

for (const user of sourceA.users) {
  userMap.set(user.id, {
    ...user,
    orders: [],
    totalSpent: 0,
    totalItems: 0
  });
}

for (const order of sourceB.orders) {
  const user = userMap.get(order.userId);
  if (user) {
    user.orders.push(order);
    user.totalSpent += order.total;
    user.totalItems += order.items;
  }
}

const merged = Array.from(userMap.values());

return {
  users: merged,
  summary: {
    totalUsers: merged.length,
    totalRevenue: merged.reduce((sum, u) => sum + u.totalSpent, 0),
    totalOrders: merged.reduce((sum, u) => sum + u.orders.length, 0)
  }
};`,
		capabilities: []
	}
];
