import { paths } from '$lib/paths';

/** Drives `/docs` Guides vs Reference grids (no slice indices). */
export type DocsHubCard = {
	group: 'guides' | 'reference';
	to: string;
	title: string;
	description: string;
	tags: string[];
};

export const docsHubCards: DocsHubCard[] = [
		{
			group: 'guides',
			to: '/docs/self-host',
			title: 'Self-Hosting',
			description: 'Deploy the public app, private Worker, and backing Cloudflare resources.',
			tags: ['Production', 'Cloudflare']
		},
	{
		group: 'guides',
		to: paths.docsHttpApi,
		title: 'HTTP API',
		description: 'Run modes, endpoints, curl, request/response shapes.',
		tags: ['REST', 'JSON']
	},
		{
			group: 'guides',
			to: paths.docsAgentIntegration,
			title: 'Agents',
			description: 'stdio MCP find + execute, or GET /lab/catalog + HTTP runs.',
			tags: ['MCP', 'AI']
		},
	{
		group: 'guides',
		to: paths.docsFaq,
		title: 'FAQ',
		description: 'Agents, sandbox, traces, limits, why edge — for AI-curious SWEs.',
		tags: ['FAQ', 'AI']
	},
	{
		group: 'guides',
		to: paths.docsTypescript,
		title: 'TypeScript Client',
		description: '@acoyfellow/lab — install, createLabClient, methods.',
		tags: ['npm', 'TypeScript']
	},
	{
		group: 'guides',
		to: paths.docsPatterns,
		title: 'Agent Patterns',
		description: 'Prove it, self-heal, handoff, canary — traces as the protocol.',
		tags: ['Agent', 'Patterns']
	},
	{
		group: 'guides',
		to: paths.docsWhenToUse,
		title: 'When to use Lab',
		description: 'Good fit vs poor fit; relationship to plain Workers.',
		tags: ['Product']
	},
	{
		group: 'reference',
		to: paths.docsArchitecture,
		title: 'Architecture',
		description: 'Worker loaders, Effect, KV snapshot, spawn, chains.',
		tags: ['Cloudflare', 'Effect']
	},
		{
			group: 'reference',
			to: paths.docsCapabilities,
			title: 'Capabilities',
			description: 'Registry-backed capability IDs, denied errors, and runtime semantics.',
			tags: ['Security']
		},
		{
			group: 'reference',
			to: paths.docsTraceSchema,
			title: 'Trace Schema',
			description: 'Saved-result viewer, `/t/:id.json`, and `traceId` semantics.',
			tags: ['Schema']
		},
	{
		group: 'reference',
		to: paths.docsLimits,
		title: 'Limits',
		description: 'Repo-enforced caps, chains, R2 invoke, platform limits.',
		tags: ['Reference']
	},
	{
		group: 'reference',
		to: paths.docsSecurity,
		title: 'Security model',
		description: 'Untrusted guest code, capabilities, operators.',
		tags: ['Reference']
	},
	{
		group: 'reference',
		to: paths.docsFailures,
		title: 'Failures & traces',
		description: 'Chain errors, empty trace on failure, isolate reasons.',
		tags: ['Reference']
	}
];

export function docsHubByGroup(g: DocsHubCard['group']): DocsHubCard[] {
	return docsHubCards.filter((c) => c.group === g);
}
