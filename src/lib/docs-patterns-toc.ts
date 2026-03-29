import { docsHeadingId } from '$lib/docs-heading-id';

/** Right-rail TOC for /docs/patterns (ids match `docsHeadingId` on h1/h2 in rendered HTML). */
export const PATTERNS_DOC_TOC = [
	{ id: docsHeadingId('Agent Patterns'), label: 'Overview' },
	{ id: docsHeadingId('Prove It'), label: 'Prove It' },
	{ id: docsHeadingId('Self-Healing Loop'), label: 'Self-Healing Loop' },
	{ id: docsHeadingId('Agent Handoff'), label: 'Agent Handoff' },
	{ id: docsHeadingId('Canary Deploy'), label: 'Canary Deploy' },
	{ id: docsHeadingId('Stress Test'), label: 'Stress Test' },
	{ id: docsHeadingId('Combining Patterns'), label: 'Combining Patterns' },
	{ id: docsHeadingId('Using Patterns from Any Agent'), label: 'Using Patterns from Any Agent' },
] as const;
