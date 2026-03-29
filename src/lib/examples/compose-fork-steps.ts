import type { ChainStep } from '@acoyfellow/lab';
import {
	CANARY_RUN_STEPS,
	COLD_BOOT_SPRINT_STEPS,
	COMPUTE_OFFLOAD_STEPS,
	ITERATIVE_REPAIR_STEPS,
	PREFLIGHT_CHECK_STEPS,
	PROOF_OF_CORRECTNESS_STEPS,
	SELF_IMPROVING_LOOP_STEPS,
	RESULT_HANDOFF_STEPS,
	ZERO_BLEED_STEPS
} from './data/agentic-examples';
import {
	DATE_MATH_STEPS,
	DEDUPE_STEPS,
	GENERATE_UUIDS_STEPS,
	HASH_STEPS,
	MAP_FILTER_REDUCE_STEPS,
	REGEX_TEST_STEPS,
	SORT_STEPS,
	TRANSFORM_STRINGS_STEPS,
	VALIDATE_JSON_STEPS,
	WORD_FREQUENCY_STEPS
} from './data/simple-examples';
import {
	API_RETRY_STEPS,
	DATA_TRANSFORMER_STEPS,
	JSON_HEALER_STEPS,
	MULTI_SOURCE_AGGREGATOR_STEPS,
	WEBHOOK_VALIDATOR_STEPS
} from '$lib/guest-code-fixtures';

const COMPOSE_FORK_STEPS_INTERNAL = {
	'json-healer': JSON_HEALER_STEPS,
	'api-retry': API_RETRY_STEPS,
	'webhook-validator': WEBHOOK_VALIDATOR_STEPS,
	'data-transformer': DATA_TRANSFORMER_STEPS,
	'multi-source-aggregator': MULTI_SOURCE_AGGREGATOR_STEPS,
	sort: SORT_STEPS,
	dedupe: DEDUPE_STEPS,
	'regex-test': REGEX_TEST_STEPS,
	'date-math': DATE_MATH_STEPS,
	hash: HASH_STEPS,
	'validate-json': VALIDATE_JSON_STEPS,
	'word-frequency': WORD_FREQUENCY_STEPS,
	'map-filter-reduce': MAP_FILTER_REDUCE_STEPS,
	'generate-uuids': GENERATE_UUIDS_STEPS,
	'transform-strings': TRANSFORM_STRINGS_STEPS,
	'proof-of-correctness': PROOF_OF_CORRECTNESS_STEPS,
	'canary-run': CANARY_RUN_STEPS,
	'zero-bleed': ZERO_BLEED_STEPS,
	'compute-offload': COMPUTE_OFFLOAD_STEPS,
	'preflight-check': PREFLIGHT_CHECK_STEPS,
	'cold-boot-sprint': COLD_BOOT_SPRINT_STEPS,
	'result-handoff': RESULT_HANDOFF_STEPS,
	'iterative-repair': ITERATIVE_REPAIR_STEPS,
	'self-improving-loop': SELF_IMPROVING_LOOP_STEPS
} as const;

export type RunnableExampleId = keyof typeof COMPOSE_FORK_STEPS_INTERNAL;

export const COMPOSE_FORK_STEPS: Record<RunnableExampleId, ChainStep[]> =
	COMPOSE_FORK_STEPS_INTERNAL;
