import { paths } from '$lib/paths';

/** Linear reading order (matches docs sidebar groups). Used for prev/next footers. */
export const DOCS_READING_ORDER: readonly { to: string; label: string }[] = [
	{ to: '/docs', label: 'Introduction' },
	{ to: '/docs/how-it-works', label: 'How It Works' },
	{ to: paths.docsWhenToUse, label: 'When to use Lab' },
	{ to: '/docs/install', label: 'Installation' },
	{ to: '/docs/self-host', label: 'Self-Hosting' },
	{ to: paths.tutorial, label: 'Tutorial' },
	{ to: paths.docsHttpApi, label: 'HTTP API' },
	{ to: paths.docsTypescript, label: 'TypeScript client' },
	{ to: paths.docsAgentIntegration, label: 'Agent integration' },
	{ to: paths.docsCapabilities, label: 'Capabilities' },
	{ to: paths.docsPatterns, label: 'Agent Patterns' },
	{ to: paths.docsFaq, label: 'FAQ' },
	{ to: paths.docsPetri, label: 'Petri' },
	{ to: paths.docsArchitecture, label: 'Architecture' },
	{ to: paths.docsSecurity, label: 'Security' },
	{ to: paths.docsLimits, label: 'Limits' },
	{ to: paths.docsFailures, label: 'Failures & step data' },
	{ to: paths.docsResultSchema, label: 'Receipt schema' },
];
