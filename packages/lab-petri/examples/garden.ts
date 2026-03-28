/**
 * Garden example using lab-petri
 * 
 * Shows how to define a schema, create a dish, and have agents inhabit it.
 */

import type { PetriSchema } from '../src/types.js';

// --- Types ---
type PlantType = 'seed' | 'sprout' | 'bloom' | 'tree' | 'fallen';

interface Plant {
  id: string;
  type: PlantType;
  age: number;
  energy: number;
  color: string;
  size: number;
  label?: string;
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
  type: 'roots' | 'pollination' | 'shade' | 'nutrients';
  strength: number;
}

interface GardenState {
  nodes: Plant[];
  links: Link[];
  tick: number;
  season: string;
}

// --- Schema ---
export const gardenSchema: PetriSchema<GardenState> = {
  id: 'garden-v1',
  mutations: ['updateNode', 'addNode', 'removeNode', 'addLink', 'removeLink', 'nextSeason', 'log'],
  seed: () => ({
    nodes: [
      { id: 'oak-1', type: 'tree', age: 12, energy: 0.9, color: '#2d5016', size: 28, label: 'Old Oak' },
      { id: 'fern-1', type: 'bloom', age: 3, energy: 0.7, color: '#4a7c29', size: 14, label: 'Fern' },
      { id: 'moss-1', type: 'sprout', age: 1, energy: 0.5, color: '#6b8f3c', size: 8, label: 'Moss' },
      { id: 'daisy-1', type: 'bloom', age: 2, energy: 0.8, color: '#f5c542', size: 12, label: 'Daisy' },
      { id: 'seed-1', type: 'seed', age: 0, energy: 0.3, color: '#8b6914', size: 5, label: 'Mystery Seed' },
    ],
    links: [
      { source: 'oak-1', target: 'fern-1', type: 'shade', strength: 0.6 },
      { source: 'oak-1', target: 'moss-1', type: 'nutrients', strength: 0.4 },
      { source: 'fern-1', target: 'daisy-1', type: 'pollination', strength: 0.3 },
    ],
    tick: 0,
    season: 'spring',
  }),
  reduce: (state, mutations) => {
    const newState = { ...state, nodes: [...state.nodes], links: [...state.links] };
    
    for (const m of mutations) {
      switch (m.op) {
        case 'updateNode': {
          const idx = newState.nodes.findIndex(n => n.id === m.id);
          if (idx !== -1) {
            newState.nodes[idx] = { ...newState.nodes[idx], ...m.updates };
          }
          break;
        }
        case 'addNode': {
          if (!newState.nodes.find(n => n.id === m.node.id)) {
            newState.nodes.push(m.node);
          }
          break;
        }
        case 'removeNode': {
          newState.nodes = newState.nodes.filter(n => n.id !== m.id);
          newState.links = newState.links.filter(l => 
            l.source !== m.id && l.target !== m.id
          );
          break;
        }
        case 'addLink': {
          newState.links.push(m.link);
          break;
        }
        case 'removeLink': {
          newState.links = newState.links.filter(l => 
            !(l.source === m.source && l.target === m.target)
          );
          break;
        }
        case 'nextSeason': {
          const seasons = ['spring', 'summer', 'autumn', 'winter'];
          const idx = seasons.indexOf(newState.season);
          newState.season = seasons[(idx + 1) % 4];
          break;
        }
      }
    }
    
    return newState;
  },
};

// --- Agent Prompt ---
export const gardenAgentPrompt = `You are a gardener tending a living garden.

Use labPetri to interact with the garden:
- await labPetri.getState() - get current garden state
- await labPetri.mutate([...mutations]) - apply changes

Garden state has:
- nodes: array of plants with {id, type, age, energy, color, size, label}
- links: array of connections {source, target, type, strength}
- tick: number
- season: 'spring' | 'summer' | 'autumn' | 'winter'

Available mutations:
- { op: 'updateNode', id: string, updates: { energy?, age?, type?, color?, size?, label? } }
- { op: 'addNode', node: Plant }
- { op: 'removeNode', id: string }
- { op: 'addLink', link: Link }
- { op: 'removeLink', source, target }
- { op: 'nextSeason' }
- { op: 'log', message: string }

Rules:
- Make 1-2 small changes per tick
- Seeds (age 0) → sprouts (1) → blooms (2) → trees (3)
- Low energy (< 0.2) plants wither
- Spring: grow, Summer: peak, Autumn: decline, Winter: dormant
- ALWAYS include a log mutation describing what you did

Example:
const state = await labPetri.getState();
const fern = state.nodes.find(n => n.id === 'fern-1');
if (fern && fern.energy < 0.9) {
  await labPetri.mutate([
    { op: 'updateNode', id: fern.id, updates: { energy: fern.energy + 0.1 } },
    { op: 'log', message: 'Gave fern some water' }
  ]);
}
state;`;
