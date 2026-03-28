/**
 * Lab integration for Petri
 *
 * Provides the labPetri binding for generated code.
 * Agents call labPetri.mutate() to interact with the dish.
 */
/**
 * Generate the labPetri shim for the guest template
 * This gets injected into the sandbox alongside other capabilities
 */
export declare function generateLabPetriShim(dishId: string, _doBindingName?: string): string;
/**
 * Prompt template for agents using labPetri
 */
export declare function generateLabPetriPrompt(dishName: string, availableMutations: string[], exampleMutations: string): string;
/**
 * Capability definition for the Lab registry
 */
export declare const LAB_PETRI_CAPABILITY: {
    id: "petri";
    binding: string;
    summary: string;
    llmHint: string;
};
//# sourceMappingURL=lab-integration.d.ts.map