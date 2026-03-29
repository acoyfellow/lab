#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ChainStep } from '@acoyfellow/lab';
import {
  createLabEffectClient,
  fetchLabCatalogEffect,
  HttpError,
} from '@acoyfellow/lab/effect';
import { Effect } from 'effect';
import * as z from 'zod';

import { catalogAtPath } from './catalogPath.js';

function requireBaseUrl(): string {
  const raw = process.env.LAB_URL?.trim();
  if (!raw) {
    throw new Error(
      'LAB_URL is required (e.g. http://localhost:5173 or your public app URL). Set it in the MCP server env.'
    );
  }
  return raw.replace(/\/+$/, '');
}

const chainStepSchema: z.ZodType<ChainStep> = z.object({
  name: z.string().optional(),
  template: z.string().optional(),
  body: z.string().optional(),
  code: z.string().optional(),
  capabilities: z.array(z.string()),
  props: z.unknown().optional(),
  input: z.unknown().optional(),
});

const guestFields = {
  body: z.string().optional(),
  code: z.string().optional(),
  template: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
};

const executeInputSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('sandbox'), ...guestFields }),
  z.object({ mode: z.literal('kv'), ...guestFields }),
  z.object({
    mode: z.literal('chain'),
    steps: z.array(chainStepSchema).min(1),
  }),
  z.object({
    mode: z.literal('spawn'),
    body: z.string().optional(),
    code: z.string().optional(),
    template: z.string().optional(),
    capabilities: z.array(z.string()),
    depth: z.number().optional(),
  }),
  z.object({
    mode: z.literal('generate'),
    prompt: z.string(),
    capabilities: z.array(z.string()),
    template: z.string().optional(),
  }),
  z.object({ mode: z.literal('seed') }),
]);

function toolJson(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function mapHttpToError(err: HttpError): Error {
  const msg = err.cause ? `${err.message} (${String(err.cause)})` : err.message;
  return new Error(msg);
}

const mcpServer = new McpServer({
  name: 'lab',
  version: '0.0.2',
});

mcpServer.registerTool(
  'find',
  {
    description:
      'Discover lab API: full GET /lab/catalog JSON, a dot-path slice (e.g. execute.chain), or GET /t/:id.json raw saved-result JSON when traceId is set.',
    inputSchema: {
      path: z
        .string()
        .optional()
        .describe('Dot path into catalog: capabilities, execute.chain, templates, … Ignored if traceId is set.'),
      traceId: z.string().optional().describe('If set, returns raw saved-result JSON for this id (GET /t/:id.json).'),
    },
  },
  async (args) => {
    const program = Effect.gen(function* () {
      const baseUrl = yield* Effect.sync(requireBaseUrl);
      const lab = createLabEffectClient({ baseUrl });
      if (args.traceId?.trim()) {
        return yield* lab.getTraceJson(args.traceId.trim());
      }
      const catalog = yield* fetchLabCatalogEffect({ baseUrl });
      if (args.path?.trim()) {
        return catalogAtPath(catalog, args.path.trim());
      }
      return catalog;
    }).pipe(
      Effect.catchTag('HttpError', (e) => Effect.fail(mapHttpToError(e)))
    );

    const data = await Effect.runPromise(program);
    return toolJson(data);
  }
);

mcpServer.registerTool(
  'execute',
  {
    description:
      'Run guest work on the lab Worker: sandbox, kv, chain, spawn, generate, or seed. Uses least-privilege capabilities you pass.',
    inputSchema: executeInputSchema,
  },
  async (input) => {
    const program = Effect.gen(function* () {
      const baseUrl = yield* Effect.sync(requireBaseUrl);
      const lab = createLabEffectClient({ baseUrl });
      switch (input.mode) {
        case 'sandbox':
          return yield* lab.runSandbox({
            body: input.body,
            code: input.code,
            template: input.template,
            capabilities: input.capabilities,
          });
        case 'kv':
          return yield* lab.runKv({
            body: input.body,
            code: input.code,
            template: input.template,
            capabilities: input.capabilities,
          });
        case 'chain':
          return yield* lab.runChain(input.steps);
        case 'spawn':
          return yield* lab.runSpawn({
            body: input.body,
            code: input.code,
            template: input.template,
            capabilities: input.capabilities,
            depth: input.depth,
          });
        case 'generate':
          return yield* lab.runGenerate({
            prompt: input.prompt,
            capabilities: input.capabilities,
            template: input.template,
          });
        case 'seed':
          return yield* lab.seed();
        default: {
          const _x: never = input;
          return _x;
        }
      }
    }).pipe(
      Effect.catchTag('HttpError', (e) => Effect.fail(mapHttpToError(e)))
    );

    const data = await Effect.runPromise(program);
    return toolJson(data);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
