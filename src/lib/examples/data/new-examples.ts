import type { ExampleData } from '../types';

export const apiRetry: ExampleData = {
	id: 'api-retry',
	title: 'API Retry with Backoff',
	description: 'Handle flaky upstreams with deterministic retries, exponential backoff, and circuit breaker logic',
	problem: 'Upstream services fail intermittently. Blind retries overwhelm failing dependencies.',
	solution: 'Simulate a flaky upstream, retry with exponential backoff, and record when the circuit would fail fast.',
	result: 'Stable retry behavior you can run locally and inspect in a saved result',
	icon: 'refresh',
	tags: ['api', 'resilience', 'retry', 'circuit-breaker'],
	steps: [
		{
			name: 'Attempt API Call',
			description: 'Call a simulated flaky upstream; fail on attempts 1 and 2, succeed on attempt 3',
			code: 'callWithRetry() -> simulateFlakyUpstream(attempt)',
			input: { attempt: 1, maxRetries: 3 },
			output: { success: true, attempt: 3, data: { source: 'simulated-upstream' } },
			capabilities: [],
			ms: 3004
		},
		{
			name: 'Retry with Backoff',
			description: 'Wait 1s, then 2s, before the final successful retry',
			code: 'delay = 1000 * Math.pow(2, attempt - 1)',
			input: { failedAttempts: [1, 2], delaysMs: [1000, 2000] },
			output: { totalDelayMs: 3000, finalAttempt: 3 },
			capabilities: [],
			ms: 3000
		},
		{
			name: 'Circuit Breaker Check',
			description: 'Record whether the circuit would fail fast after repeated upstream failures',
			code: 'if (failures >= threshold) return circuitOpen',
			input: { failures: 2, threshold: 3 },
			output: { circuitOpen: false, healthy: true },
			capabilities: [],
			ms: 1
		}
	]
};

export const webhookValidator: ExampleData = {
	id: 'webhook-validator',
	title: 'Secure Webhook Handler',
	description: 'Verify HMAC signatures and validate webhook payloads from Stripe, GitHub, or Shopify',
	problem: 'Webhooks can be spoofed. Invalid payloads crash handlers. Duplicate deliveries cause bugs.',
	solution: 'Verify HMAC-SHA256 signatures. Validate JSON schema. Use idempotency keys for deduplication.',
	result: 'Secure webhook processing with signature verification and duplicate detection',
	icon: 'shield',
	tags: ['security', 'webhooks', 'validation', 'hmac'],
	steps: [
		{
			name: 'Verify Signature',
			description: 'Compute HMAC-SHA256 and compare with header',
			code: 'crypto.subtle.sign("HMAC", key, payload)',
			input: { payload: '{"event":"payment.success"}' },
			output: { verified: true, signature: 'sha256=...' },
			capabilities: [],
			ms: 12
		},
		{
			name: 'Parse & Validate',
			description: 'Schema validation for required fields',
			code: 'validateSchema(payload, schema)',
			input: { event: 'payment.success', id: 'evt_123' },
			output: { valid: true, errors: [] },
			capabilities: [],
			ms: 3
		},
		{
			name: 'Route to Handler',
			description: 'Generate idempotency key and route',
			code: 'idempotencyKey = `${event}:${id}`',
			input: { event: 'payment.success', id: 'evt_123' },
			output: { routed: true, action: 'process_payment' },
			capabilities: [],
			ms: 5
		}
	]
};

export const dataTransformer: ExampleData = {
	id: 'data-transformer',
	title: 'Data Transformer',
	description: 'Parse, validate, and transform messy data into clean structured output',
	problem: 'Data comes in various formats with inconsistent types and missing validation.',
	solution: 'Auto-detect format, normalize fields, validate schema, transform to standard output.',
	result: 'Clean, validated data ready for storage or further processing',
	icon: 'transform',
	tags: ['data', 'etl', 'validation', 'transformation'],
	steps: [
		{
			name: 'Detect Format',
			description: 'Identify if input is JSON, CSV, or XML',
			code: 'detectFormat(rawData)',
			input: { data: '{"name":"John","age":"30"}' },
			output: { format: 'json' },
			capabilities: [],
			ms: 2
		},
		{
			name: 'Parse & Normalize',
			description: 'Convert types and standardize structure',
			code: '{ age: Number(data.age), active: Boolean(data.active) }',
			input: { name: 'John', age: '30', active: 'true' },
			output: { name: 'John', age: 30, active: true },
			capabilities: [],
			ms: 5
		},
		{
			name: 'Validate Schema',
			description: 'Check required fields and types',
			code: 'schema.validate(data)',
			input: { name: 'John', age: 30 },
			output: { valid: true, errors: [] },
			capabilities: [],
			ms: 3
		},
		{
			name: 'Transform Output',
			description: 'Apply final transformations',
			code: '{ fullName: data.name.toUpperCase(), birthYear: currentYear - data.age }',
			input: { name: 'John', age: 30, active: true },
			output: { fullName: 'JOHN', birthYear: 1996, status: 'active' },
			capabilities: [],
			ms: 4
		}
	]
};

export const multiSourceAggregator: ExampleData = {
	id: 'multi-source-aggregator',
	title: 'Multi-Source Aggregator',
	description: 'Merge multiple source snapshots, then combine and analyze them in one workflow',
	problem: 'Need to combine related datasets from multiple upstream snapshots for unified reporting.',
	solution: 'Load mocked source snapshots, merge them, and compute aggregated metrics in one saved result.',
	result: 'Unified dataset with computed metrics across both source snapshots',
	icon: 'aggregate',
	tags: ['api', 'aggregation', 'parallel', 'analytics'],
	steps: [
		{
			name: 'Fetch Source A',
			description: 'Load the first source snapshot of user data',
			code: 'fetchSourceA()',
			input: {},
			output: { users: [{ id: 1, name: 'Alice' }] },
			capabilities: [],
			ms: 245
		},
		{
			name: 'Fetch Source B',
			description: 'Load the second source snapshot of order data and pair it with source A',
			code: 'fetchSourceB(); return { sourceA, sourceB }',
			input: { sourceA: { users: [{ id: 1, name: 'Alice' }] } },
			output: { sourceA: { users: [{ id: 1, name: 'Alice' }] }, sourceB: { orders: [{ userId: 1, total: 100 }] } },
			capabilities: [],
			ms: 189
		},
		{
			name: 'Merge & Aggregate',
			description: 'Join datasets and compute metrics',
			code: 'users.map(u => ({ ...u, orders: orders.filter(o => o.userId === u.id) }))',
			input: { users: [], orders: [] },
			output: { 
				merged: [{ id: 1, name: 'Alice', orders: [], totalSpent: 100 }],
				summary: { totalRevenue: 350, totalOrders: 5 }
			},
			capabilities: [],
			ms: 15
		}
	]
};
