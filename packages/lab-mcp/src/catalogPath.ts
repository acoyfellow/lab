import type { LabCatalog } from '@acoyfellow/lab';

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Safe dot-path read on catalog JSON (progressive disclosure for `find`).
 */
export function catalogAtPath(catalog: LabCatalog, path: string): unknown {
  const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
  let cur: unknown = catalog;
  for (const p of parts) {
    if (FORBIDDEN.has(p)) {
      throw new Error(`Invalid path segment: ${p}`);
    }
    if (cur === null || typeof cur !== 'object') {
      throw new Error(`No value at path segment "${p}"`);
    }
    if (!Object.prototype.hasOwnProperty.call(cur, p)) {
      throw new Error(`Unknown path: ${path} (missing "${p}")`);
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
