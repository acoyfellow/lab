/**
 * lab-petri
 *
 * Persistent substrate for Lab experiments.
 * Durable Object backed state with real-time sync.
 *
 * @example
 * ```typescript
 * // Server: Define a garden schema
 * const gardenSchema: PetriSchema<GardenState> = {
 *   id: 'garden-v1',
 *   mutations: ['updateNode', 'addNode', 'removeNode', 'nextSeason', 'log'],
 *   seed: () => ({ plants: [], links: [], tick: 0, season: 'spring' }),
 *   reduce: (state, mutations) => {
 *     // Apply mutations...
 *     return newState;
 *   }
 * };
 *
 * // Client: Connect and observe
 * const client = new PetriClient<GardenState>({
 *   wsUrl: 'wss://lab.coey.dev/petri/garden-1',
 *   apiUrl: 'https://lab.coey.dev/petri/garden-1',
 *   dishId: 'garden-1'
 * });
 *
 * client.subscribe(snapshot => {
 *   renderGarden(snapshot.state);
 * });
 *
 * // Agent: Inhabit the dish
 * const result = await runGenerate({
 *   prompt: 'Tend the garden using labPetri',
 *   capabilities: ['petri'],
 *   mode: 'code'
 * });
 * ```
 */
export { PetriDish } from './durable-object.js';
export { PetriClient, createPetriStore } from './client.js';
export { generateLabPetriShim, generateLabPetriPrompt, LAB_PETRI_CAPABILITY, } from './lab-integration.js';
export type { PetriSchema, PetriConfig, PetriSnapshot, PetriMessage, PetriMutateRequest, PetriMutateResponse, PetriObserver, Mutation, } from './types.js';
//# sourceMappingURL=index.d.ts.map