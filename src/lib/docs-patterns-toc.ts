import { docsHeadingId } from '$lib/docs-heading-id';

/** Right-rail TOC for /docs/patterns (ids match `docsHeadingId` on h1/h2 in rendered HTML). */
export const PATTERNS_DOC_TOC = [
	{ id: docsHeadingId('Patterns'), label: 'Overview' },
	{ id: docsHeadingId('Prove it'), label: 'Prove it' },
	{ id: docsHeadingId('Self-heal'), label: 'Self-heal' },
	{ id: docsHeadingId('Handoff'), label: 'Handoff' },
	{ id: docsHeadingId('Canary'), label: 'Canary' },
	{ id: docsHeadingId('Stress test'), label: 'Stress test' },
	{ id: docsHeadingId('How agents call Lab'), label: 'How agents call Lab' },
] as const;
