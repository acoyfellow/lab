import { paths } from '$lib/paths';

export type DocsNavItem = { label: string; to: string; active: boolean };

export type DocsNavSection = { title: string; items: DocsNavItem[] };

function isNavActive(pathname: string, to: string): boolean {
	if (to === '/docs') return pathname === '/docs';
	return pathname === to || pathname.startsWith(`${to}/`);
}

function buildSections(pathname: string): DocsNavSection[] {
	const items: { title: string; entries: { label: string; to: string }[] }[] = [
		{
			title: 'Start',
			entries: [
				{ label: 'Overview', to: '/docs' },
				{ label: 'Tutorial', to: paths.tutorial },
				{ label: 'Patterns', to: paths.docsPatterns },
				{ label: 'When to use Lab', to: paths.docsWhenToUse },
			],
		},
		{
			title: 'API',
			entries: [
				{ label: 'HTTP API', to: paths.docsHttpApi },
				{ label: 'TypeScript client', to: paths.docsTypescript },
				{ label: 'MCP for agents', to: paths.docsAgentIntegration },
				{ label: 'Receipt schema', to: paths.docsResultSchema },
			],
		},
		{
			title: 'How it works',
			entries: [
				{ label: 'Execution model', to: '/docs/how-it-works' },
				{ label: 'Capabilities', to: paths.docsCapabilities },
				{ label: 'Architecture', to: paths.docsArchitecture },
				{ label: 'Petri (shared state)', to: paths.docsPetri },
				{ label: 'Failures & step data', to: paths.docsFailures },
			],
		},
		{
			title: 'Operate',
			entries: [
				{ label: 'Install', to: '/docs/install' },
				{ label: 'Self-host', to: paths.docsSelfHost },
				{ label: 'Limits', to: paths.docsLimits },
				{ label: 'Security', to: paths.docsSecurity },
				{ label: 'FAQ', to: paths.docsFaq },
			],
		},
	];

	return items.map((section) => ({
		title: section.title,
		items: section.entries.map((e) => ({
			...e,
			active: isNavActive(pathname, e.to),
		})),
	}));
}

export function getDocsNavSections(pathname: string): DocsNavSection[] {
	return buildSections(pathname);
}
