import type { ExampleData } from '../types';

export const immutableWitness: ExampleData = {
	id: 'immutable-witness',
	title: 'The Immutable Witness',
	description: 'Prove compliance with a shareable trace',
	problem: 'Regulator demands proof of how AI processed sensitive customer data',
	solution: 'Every action timestamped, logged, and shareable via URL',
	result: 'Prove compliance with a URL.',
	icon: 'scale',
	tags: ['security', 'compliance', 'audit', 'pii'],
	steps: [
		{
			name: 'Access Customer Record',
			description: 'PII accessed from KV',
			code: 'await kv.get("customer:12345")',
			input: { customerId: '12345' },
			output: { 
				record_accessed: 'customer:12345',
				fields: ['name', 'email', 'ssn_last4', 'account_balance'],
				pii_accessed: true
			},
			capabilities: ['kvRead'],
			ms: 12
		},
		{
			name: 'AI Processing',
			description: 'Customer data sent to AI model',
			code: 'await ai.run("@cf/meta/llama-3.1-8b", { prompt })',
			input: { 
				model: '@cf/meta/llama-3.1-8b-instruct',
				prompt_length: 245,
				system_prompt: 'Evaluate credit risk'
			},
			output: {
				risk_score: 0.23,
				decision: 'APPROVED',
				confidence: 0.94,
				tokens_used: 156
			},
			capabilities: ['workersAi'],
			ms: 234
		},
		{
			name: 'Decision Logged',
			description: 'Approval decision with criteria',
			code: 'return { approved: score > 0.8 }',
			input: { 
				risk_score: 0.23,
				threshold: 0.8 
			},
			output: {
				approved: true,
				decision_criteria: 'risk_score < 0.8',
				customer_id: '12345',
				processed_at: '2026-03-25T10:23:45.359Z'
			},
			capabilities: [],
			ms: 1
		}
	]
};
