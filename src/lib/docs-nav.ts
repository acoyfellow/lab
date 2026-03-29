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
			title: 'Getting started',
			entries: [
				{ label: 'Introduction', to: '/docs' },
				{ label: 'How It Works', to: '/docs/how-it-works' },
				{ label: 'When to use Lab', to: paths.docsWhenToUse },
				{ label: 'Installation', to: '/docs/install' },
				{ label: 'Self-Hosting', to: '/docs/self-host' },
				{ label: 'Tutorial', to: paths.tutorial },
			],
		},
		{
			title: 'Integration',
			entries: [
				{ label: 'HTTP API', to: paths.docsHttpApi },
				{ label: 'TypeScript Client', to: paths.docsTypescript },
				{ label: 'Agent Integration', to: paths.docsAgentIntegration },
				{ label: 'Capabilities', to: paths.docsCapabilities },
			],
		},
		{
			title: 'Guides',
			entries: [
				{ label: 'Agent Patterns', to: paths.docsPatterns },
				{ label: 'FAQ', to: paths.docsFaq },
				{ label: 'Petri', to: paths.docsPetri },
			],
		},
		{
			title: 'Reference',
			entries: [
				{ label: 'Architecture', to: paths.docsArchitecture },
				{ label: 'Security', to: paths.docsSecurity },
				{ label: 'Limits', to: paths.docsLimits },
				{ label: 'Failures & step data', to: paths.docsFailures },
				{ label: 'Saved Result Schema', to: paths.docsResultSchema },
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
