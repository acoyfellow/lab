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
export function generateLabPetriShim(
  dishId: string,
  _doBindingName: string = 'LAB_PETRI_DO'
): string {
  return `
const labPetri = {
  async mutate(mutations) {
    const res = await fetch("http://internal/invoke/petri", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        dishId: ${JSON.stringify(dishId)},
        mutations 
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "petri mutate failed");
    return data.snapshot;
  },
  
  async getState() {
    const res = await fetch("http://internal/invoke/petri/snapshot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dishId: ${JSON.stringify(dishId)} }),
    });
    const data = await res.json();
    return data.state;
  }
};
`;
}

/**
 * Prompt template for agents using labPetri
 */
export function generateLabPetriPrompt(
  dishName: string,
  availableMutations: string[],
  exampleMutations: string
): string {
  return `You are interacting with a ${dishName} experiment.

You have access to the labPetri binding:
- await labPetri.getState() - returns current state
- await labPetri.mutate(mutations) - applies mutations

Available mutations:
${availableMutations.map(m => `- ${m}`).join('\n')}

Example:
${exampleMutations}

Write JavaScript that interacts with the experiment using labPetri.
The last expression should be the result (often labPetri.mutate returns the new state).`;
}

/**
 * Capability definition for the Lab registry
 */
export const LAB_PETRI_CAPABILITY = {
  id: 'petri' as const,
  binding: 'LAB_PETRI_DO',
  summary: 'Mutate and observe Petri dish experiments via Durable Object.',
  llmHint: '`labPetri.getState()` / `labPetri.mutate(mutations[])` - async, returns snapshot.',
};
