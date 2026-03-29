export type { ExampleId, ExampleStep, ExampleData, ExampleProps } from './types';

export { jsonHealer, brokenJsonVariations } from './data/json-healer';
export { apiRetry, webhookValidator, dataTransformer, multiSourceAggregator } from './data/new-examples';
export { invisibleKey } from './data/invisible-key';
export { forbiddenDoor } from './data/forbidden-door';
export { immutableWitness } from './data/immutable-witness';

export {
	sort, SORT_STEPS,
	dedupe, DEDUPE_STEPS,
	regexTest, REGEX_TEST_STEPS,
	dateMath, DATE_MATH_STEPS,
	hash, HASH_STEPS,
	validateJson, VALIDATE_JSON_STEPS,
	wordFrequency, WORD_FREQUENCY_STEPS,
	mapFilterReduce, MAP_FILTER_REDUCE_STEPS,
	generateUuids, GENERATE_UUIDS_STEPS,
	transformStrings, TRANSFORM_STRINGS_STEPS,
} from './data/simple-examples';

export {
	proofOfCorrectness, PROOF_OF_CORRECTNESS_STEPS,
	canaryRun, CANARY_RUN_STEPS,
	zeroBleed, ZERO_BLEED_STEPS,
	computeOffload, COMPUTE_OFFLOAD_STEPS,
	preflightCheck, PREFLIGHT_CHECK_STEPS,
	coldBootSprint, COLD_BOOT_SPRINT_STEPS,
	resultHandoff, RESULT_HANDOFF_STEPS,
	iterativeRepair, ITERATIVE_REPAIR_STEPS,
	selfImprovingLoop, SELF_IMPROVING_LOOP_STEPS,
} from './data/agentic-examples';
