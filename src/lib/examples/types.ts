/**
 * Example type definitions for reusable demo components
 * Each example can be rendered standalone or embedded anywhere
 */

export type ExampleId = 'json-healer' | 'api-retry' | 'webhook-validator' | 'data-transformer' | 'multi-source-aggregator' | 'invisible-key' | 'forbidden-door' | 'immutable-witness' | 'sort' | 'dedupe' | 'regex-test' | 'date-math' | 'hash' | 'validate-json' | 'word-frequency' | 'map-filter-reduce' | 'generate-uuids' | 'transform-strings' | 'proof-of-correctness' | 'canary-run' | 'zero-bleed' | 'compute-offload' | 'preflight-check' | 'cold-boot-sprint' | 'result-handoff' | 'iterative-repair' | 'self-improving-loop';

export type ExampleStep = {
	name: string;
	description?: string;
	code?: string;
	input?: unknown;
	output?: unknown;
	capabilities: string[];
	ms?: number;
	error?: string;
};

export type ExampleData = {
	id: ExampleId;
	title: string;
	description: string;
	problem: string;
	solution: string;
	result: string;
	icon?: string;
	steps: ExampleStep[];
	tags: string[];
	complexity?: 'simple' | 'workflow' | 'agentic';
	startHere?: boolean;
	featured?: boolean;
	resultValue?: string;
};

export type ExampleProps = {
	data: ExampleData;
	variant: 'mini' | 'card' | 'full' | 'hero';
	interactive?: boolean;
	onRun?: () => void;
};
