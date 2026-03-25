import { describe, expect, test } from 'bun:test';
import type { LabCatalog } from '@acoyfellow/lab';

import { catalogAtPath } from './catalogPath.js';

/** Minimal shape for path tests only */
const cat = {
  version: '0.0.1',
  capabilities: [{ id: 'kvRead', binding: 'KV', summary: '', llmHint: '' }],
  templates: [],
  execute: {
    sandbox: { method: 'POST', path: '/run', body: {} },
    kv: { method: 'POST', path: '/run/kv', body: {} },
    chain: { method: 'POST', path: '/run/chain', body: {} },
    spawn: { method: 'POST', path: '/run/spawn', body: {} },
    generate: { method: 'POST', path: '/run/generate', body: {} },
  },
  trace: { get: '', getJson: '', note: '' },
  seed: { method: 'POST', path: '/seed', note: '' },
} as const satisfies LabCatalog;

describe('catalogAtPath', () => {
  test('scalar at top-level path', () => {
    expect(catalogAtPath(cat, 'version')).toBe('0.0.1');
  });

  test('nested path', () => {
    expect(catalogAtPath(cat, 'execute.chain.path')).toBe('/run/chain');
  });

  test('rejects __proto__', () => {
    expect(() => catalogAtPath(cat, '__proto__')).toThrow(/Invalid path/);
  });

  test('rejects missing key', () => {
    expect(() => catalogAtPath(cat, 'nope')).toThrow(/Unknown path/);
  });
});
