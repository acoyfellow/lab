import type { ChainStep } from '@acoyfellow/lab';
import {
	API_RETRY_STEPS,
	DATA_TRANSFORMER_STEPS,
	JSON_HEALER_STEPS,
	MULTI_SOURCE_AGGREGATOR_STEPS,
	WEBHOOK_VALIDATOR_STEPS
} from '$lib/guest-code-fixtures';

/** Example ids that appear on `/examples` and fork into Compose via `sessionStorage` `lab-fork`. */
export type RunnableExampleId =
	| 'json-healer'
	| 'api-retry'
	| 'webhook-validator'
	| 'data-transformer'
	| 'multi-source-aggregator';

export const COMPOSE_FORK_STEPS: Record<RunnableExampleId, ChainStep[]> = {
	'json-healer': JSON_HEALER_STEPS,
	'api-retry': API_RETRY_STEPS,
	'webhook-validator': WEBHOOK_VALIDATOR_STEPS,
	'data-transformer': DATA_TRANSFORMER_STEPS,
	'multi-source-aggregator': MULTI_SOURCE_AGGREGATOR_STEPS
};
