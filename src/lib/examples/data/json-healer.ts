import type { ExampleData } from '../types';

export const jsonHealer: ExampleData = {
	id: 'json-healer',
	title: 'JSON Healer',
	description: 'Fix broken JSON automatically with full audit trail',
	problem: 'APIs return malformed JSON with trailing commas, missing quotes, or syntax errors',
	solution: 'Lab iterates until JSON is valid, showing every attempt in the trace',
	result: 'Robust data ingestion that never crashes on bad input',
	icon: 'wand',
	tags: ['json', 'validation', 'healing', 'data'],
	complexity: 'workflow',
	startHere: true,
	featured: true,
	traceValue: 'Trace shows the failed parse, the repair step, and the final validated output in one shareable receipt.',
	steps: [
		{
			name: 'Load Broken JSON',
			description: 'Receive malformed JSON from external API',
			input: {
				json: '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob",}]}'
			},
			output: { loaded: true },
			capabilities: [],
			ms: 2
		},
		{
			name: 'Parse Attempt',
			description: 'Try to parse JSON - fails due to trailing comma',
			code: 'JSON.parse(input.json)',
			input: { json: '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob",}]}' },
			output: null,
			error: 'SyntaxError: Unexpected token } in JSON at position 76',
			capabilities: [],
			ms: 1
		},
		{
			name: 'Auto-Heal',
			description: 'Remove trailing commas and fix syntax',
			code: `json.replace(/,(\\s*[}\\]])/g, '$1')`,
			input: { json: '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob",}]}' },
			output: { 
				fixed: '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}',
				changes: ['Removed trailing comma after Bob object']
			},
			capabilities: [],
			ms: 3
		},
		{
			name: 'Validate',
			description: 'Parse succeeds - JSON is now valid',
			code: 'JSON.parse(fixedJson)',
			input: { json: '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}' },
			output: {
				users: [
					{ id: 1, name: 'Alice' },
					{ id: 2, name: 'Bob' }
				]
			},
			capabilities: [],
			ms: 1
		}
	]
};

export const brokenJsonVariations = [
	{
		name: 'Trailing Commas',
		broken: '{"a": 1, "b": 2,}',
		fixed: '{"a": 1, "b": 2}'
	},
	{
		name: 'Missing Quotes',
		broken: '{name: "test", value: 123}',
		fixed: '{"name": "test", "value": 123}'
	},
	{
		name: 'Nested Errors',
		broken: '{"items": [{"x": 1,}, {"y": 2}]}',
		fixed: '{"items": [{"x": 1}, {"y": 2}]}'
	}
];
