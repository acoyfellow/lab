/**
 * Example type definitions for reusable demo components
 * Each example can be rendered standalone or embedded anywhere
 */

export type ExampleId = 'json-healer' | 'invisible-key' | 'forbidden-door' | 'immutable-witness';

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
};

export type ExampleProps = {
	data: ExampleData;
	variant: 'mini' | 'card' | 'full' | 'hero';
	interactive?: boolean;
	onRun?: () => void;
};
