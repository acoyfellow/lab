import type { LabClientOptions } from './client.js';
import { normalizeBaseUrl, requestJSON } from './wire.js';

export type LabCatalogCapability = {
  readonly id: string;
  readonly binding: string;
  readonly summary: string;
  readonly llmHint: string;
};

export type LabCatalogTemplate = {
  readonly id: string;
  readonly summary: string;
};

export type LabCatalogExecuteFieldMap = {
  readonly [key: string]: string | LabCatalogExecuteFieldMap;
};

export type LabCatalogExecuteMode = {
  readonly method: string;
  readonly path: string;
  readonly body: LabCatalogExecuteFieldMap;
};

export type LabCatalogExecute = {
  readonly sandbox: LabCatalogExecuteMode;
  readonly kv: LabCatalogExecuteMode;
  readonly chain: {
    readonly method: string;
    readonly path: string;
    readonly body: LabCatalogExecuteFieldMap;
  };
  readonly spawn: LabCatalogExecuteMode;
  readonly generate: LabCatalogExecuteMode;
};

export type LabCatalog = {
  readonly version: string;
  readonly capabilities: readonly LabCatalogCapability[];
  readonly templates: readonly LabCatalogTemplate[];
  readonly execute: LabCatalogExecute;
  readonly result: {
    readonly get: string;
    readonly getJson: string;
    readonly note: string;
  };
  readonly seed: {
    readonly method: string;
    readonly path: string;
    readonly note: string;
  };
};

export function fetchLabCatalog(options: LabClientOptions): Promise<LabCatalog> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const baseFetch = options.fetch ?? globalThis.fetch;
  const token = options.token?.trim();
  const fetchImpl: typeof fetch = token
    ? ((input, init) => {
        const headers = new Headers(init?.headers);
        if (!headers.has('authorization') && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return baseFetch(input, { ...init, headers });
      })
    : baseFetch;
  return requestJSON<LabCatalog>(baseUrl, fetchImpl, '/lab/catalog', { method: 'GET' });
}
