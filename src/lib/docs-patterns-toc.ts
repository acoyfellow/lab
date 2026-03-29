import { docsHeadingId } from '$lib/docs-heading-id';

/** Right-rail TOC for /docs/patterns (ids match `docsHeadingId` on h1/h2 in rendered HTML). */
export const PATTERNS_DOC_TOC = [
	{ id: docsHeadingId('Agent Patterns'), label: 'Overview' },
	{ id: docsHeadingId('Prove It'), label: 'Prove It' },
	{ id: docsHeadingId('Self-Improving Loop'), label: 'Self-Improving Loop' },
	{ id: docsHeadingId('Self-Healing Loop'), label: 'Self-Healing Loop' },
	{ id: docsHeadingId('Agent Handoff'), label: 'Agent Handoff' },
	{ id: docsHeadingId('Canary Deploy'), label: 'Canary Deploy' },
	{ id: docsHeadingId('Compute Offload'), label: 'Compute Offload' },
	{ id: docsHeadingId('Zero Bleed (Isolation Proof)'), label: 'Zero Bleed (Isolation Proof)' },
	{ id: docsHeadingId('Combining Patterns'), label: 'Combining Patterns' },
	{ id: docsHeadingId('Using Patterns from Any Agent'), label: 'Using Patterns from Any Agent' },
] as const;
