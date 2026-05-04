import { paths } from '$lib/paths';

/**
 * Doc index groups, in reading order. Keep this list short and grouped by
 * intent ("what am I trying to do?"), not by document type.
 */
export type DocsHubGroup = 'start' | 'api' | 'concepts' | 'operate';

export type DocsHubCard = {
	group: DocsHubGroup;
	to: string;
	title: string;
	description: string;
};

export const DOCS_HUB_GROUPS: { id: DocsHubGroup; heading: string; subheading: string }[] = [
	{ id: 'start', heading: 'Start here', subheading: 'Get something running and read the receipt.' },
	{ id: 'api', heading: 'API', subheading: 'How agents call Lab.' },
	{ id: 'concepts', heading: 'How it works', subheading: 'The execution model in plain language.' },
	{ id: 'operate', heading: 'Operate', subheading: 'Deploy and run Lab in production.' }
];

export const docsHubCards: DocsHubCard[] = [
	// Start here
	{
		group: 'start',
		to: paths.tutorial,
		title: '2-minute tutorial',
		description: 'Install the client, run code, open the receipt URL.'
	},
	{
		group: 'start',
		to: paths.docsPatterns,
		title: 'Patterns',
		description: 'Prove-it, self-heal, handoff, canary — receipts as the protocol.'
	},
	{
		group: 'start',
		to: paths.docsWhenToUse,
		title: 'When to use Lab',
		description: 'Good fit vs poor fit. How it differs from a plain Worker.'
	},

	// API
	{
		group: 'api',
		to: paths.docsHttpApi,
		title: 'HTTP API',
		description: 'Endpoints, request bodies, curl examples.'
	},
	{
		group: 'api',
		to: paths.docsTypescript,
		title: 'TypeScript client',
		description: '@acoyfellow/lab — createLabClient and methods.'
	},
	{
		group: 'api',
		to: paths.docsAgentIntegration,
		title: 'MCP for agents',
		description: 'stdio MCP find + execute, or GET /lab/catalog.'
	},
	{
		group: 'api',
		to: paths.docsResultSchema,
		title: 'Receipt schema',
		description: 'The JSON shape at /results/:id.json.'
	},

	// How it works
	{
		group: 'concepts',
		to: '/docs/how-it-works',
		title: 'Execution model',
		description: 'Isolates, capabilities, chains, spawn, receipts.'
	},
	{
		group: 'concepts',
		to: paths.docsCapabilities,
		title: 'Capabilities reference',
		description: 'What each capability does and how denials surface.'
	},
	{
		group: 'concepts',
		to: paths.docsArchitecture,
		title: 'Architecture',
		description: 'Worker Loaders, Effect, KV snapshot, spawn semantics.'
	},
	{
		group: 'concepts',
		to: paths.docsFailures,
		title: 'Failures & step data',
		description: 'How errors surface in receipts and which fields you can rely on.'
	},

	// Operate
	{
		group: 'operate',
		to: paths.docsSelfHost,
		title: 'Self-host',
		description: 'Deploy to your Cloudflare account with one bearer token.'
	},
	{
		group: 'operate',
		to: paths.docsLimits,
		title: 'Limits',
		description: 'Repo-enforced caps, chain depth, platform limits.'
	},
	{
		group: 'operate',
		to: paths.docsSecurity,
		title: 'Security model',
		description: 'Untrusted guest code, capabilities, operator surface.'
	},
	{
		group: 'operate',
		to: paths.docsFaq,
		title: 'FAQ',
		description: 'Common questions about agents, sandbox, receipts, edge.'
	}
];

export function docsHubByGroup(g: DocsHubGroup): DocsHubCard[] {
	return docsHubCards.filter((c) => c.group === g);
}
