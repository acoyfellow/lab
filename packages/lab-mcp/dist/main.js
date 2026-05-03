#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLabEffectClient, fetchLabCatalogEffect, } from '@acoyfellow/lab/effect';
import { Effect } from 'effect';
import * as z from 'zod';
import { catalogAtPath } from './catalogPath.js';
function requireBaseUrl() {
    const raw = process.env.LAB_URL?.trim();
    if (!raw) {
        throw new Error('LAB_URL is required (e.g. http://localhost:5173 or your public app URL). Set it in the MCP server env.');
    }
    return raw.replace(/\/+$/, '');
}
/**
 * Optional bearer token. Required when the target lab instance has
 * `LAB_AUTH_TOKEN` configured. Leave unset for the public instance.
 */
function getToken() {
    const raw = process.env.LAB_TOKEN?.trim();
    return raw && raw.length > 0 ? raw : undefined;
}
function authHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
const chainStepSchema = z.object({
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
const receiptReplaySchema = z.object({
    mode: z.enum(['inspect-only', 'rerun-sandbox', 'rerun-live-requires-approval', 'continue-from-here']),
    available: z.boolean().optional(),
    reason: z.string().optional(),
});
const artifactSchema = z.object({
    provider: z.literal('cloudflare-artifacts').optional(),
    repo: z.string(),
    branch: z.string().optional(),
    head: z.string().optional(),
    remote: z.string().optional(),
});
const sessionInputSchema = z.discriminatedUnion('mode', [
    z.object({
        mode: z.literal('create'),
        title: z.string().optional(),
        artifact: artifactSchema.optional(),
    }),
    z.object({
        mode: z.literal('get'),
        sessionId: z.string(),
    }),
    z.object({
        mode: z.literal('list'),
    }),
    z.object({
        mode: z.literal('summary'),
        sessionId: z.string(),
        goal: z.string().optional(),
        state: z.string().optional(),
        nextAction: z.string().optional(),
        risks: z.array(z.string()).optional(),
        importantReceiptIds: z.array(z.string()).optional(),
        updatedByReceiptId: z.string().optional(),
    }),
]);
const receiptInputSchema = z.object({
    source: z.string().describe('Tool/server/system that performed the work, e.g. cf-portal, playwright, the-machine.'),
    action: z.string().describe('Action or tool name, e.g. workers.list or browser.click.'),
    actor: z.unknown().optional(),
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    capabilities: z.array(z.string()).optional(),
    replay: receiptReplaySchema.optional(),
    evidence: z.unknown().optional(),
    metadata: z.unknown().optional(),
    ok: z.boolean().optional(),
    error: z.string().optional(),
    reason: z.string().optional(),
    parentId: z.string().optional(),
    supersedes: z.string().optional(),
    sessionId: z.string().optional(),
    artifact: artifactSchema.optional(),
    timing: z.object({
        totalMs: z.number().optional(),
        generateMs: z.number().optional(),
        runMs: z.number().optional(),
    }).optional(),
});
function toolJson(data) {
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(data, null, 2),
            },
        ],
    };
}
function mapHttpToError(err) {
    const msg = err.cause ? `${err.message} (${String(err.cause)})` : err.message;
    return new Error(msg);
}
async function fetchSavedResultJson(baseUrl, resultId) {
    const response = await fetch(`${baseUrl}/results/${resultId}.json`, {
        headers: authHeaders(),
    });
    if (!response.ok) {
        throw new Error(`GET /results/${resultId}.json failed with status ${response.status}`);
    }
    return response.json();
}
const mcpServer = new McpServer({
    name: 'lab',
    version: '0.0.3',
});
mcpServer.registerTool('find', {
    description: 'Discover lab API: full GET /lab/catalog JSON, a dot-path slice (e.g. execute.chain), or GET /results/:id.json raw saved-result JSON when resultId is set.',
    inputSchema: {
        path: z
            .string()
            .optional()
            .describe('Dot path into catalog: capabilities, execute.chain, templates, … Ignored if resultId is set.'),
        resultId: z.string().optional().describe('If set, returns raw saved-result JSON for this id (GET /results/:id.json).'),
    },
}, async (args) => {
    const baseUrl = requireBaseUrl();
    if (args.resultId?.trim()) {
        return toolJson(await fetchSavedResultJson(baseUrl, args.resultId.trim()));
    }
    const catalog = await Effect.runPromise(fetchLabCatalogEffect({ baseUrl, token: getToken() }).pipe(Effect.mapError(mapHttpToError)));
    const data = args.path?.trim()
        ? catalogAtPath(catalog, args.path.trim())
        : catalog;
    return toolJson(data);
});
mcpServer.registerTool('execute', {
    description: 'Run guest work on the lab Worker: sandbox, kv, chain, spawn, generate, or seed. Uses least-privilege capabilities you pass.',
    inputSchema: executeInputSchema,
}, async (input) => {
    const program = Effect.gen(function* () {
        const baseUrl = yield* Effect.sync(requireBaseUrl);
        const lab = createLabEffectClient({ baseUrl, token: getToken() });
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
                const _x = input;
                return _x;
            }
        }
    }).pipe(Effect.mapError(mapHttpToError));
    const data = await Effect.runPromise(program);
    return toolJson(data);
});
mcpServer.registerTool('session', {
    description: 'Create, get, or list Lab sessions. A session binds a Cloudflare Artifact worktree to the receipt trail an agent writes while it works.',
    inputSchema: sessionInputSchema,
}, async (input) => {
    const program = Effect.gen(function* () {
        const baseUrl = yield* Effect.sync(requireBaseUrl);
        const lab = createLabEffectClient({ baseUrl, token: getToken() });
        switch (input.mode) {
            case 'create':
                return yield* lab.createSession({ title: input.title, artifact: input.artifact });
            case 'get':
                return yield* lab.getSession(input.sessionId);
            case 'list':
                return yield* lab.listSessions();
            case 'summary':
                return yield* lab.updateSessionSummary(input.sessionId, {
                    goal: input.goal,
                    state: input.state,
                    nextAction: input.nextAction,
                    risks: input.risks,
                    importantReceiptIds: input.importantReceiptIds,
                    updatedByReceiptId: input.updatedByReceiptId,
                });
            default: {
                const _x = input;
                return _x;
            }
        }
    }).pipe(Effect.mapError(mapHttpToError));
    const data = await Effect.runPromise(program);
    return toolJson(data);
});
mcpServer.registerTool('receipt', {
    description: 'Save a Lab receipt for external agent work: MCP calls, browser actions, long-running task checkpoints, decisions, or handoffs. Returns resultId for GET /results/:id.json and viewer URL.',
    inputSchema: receiptInputSchema,
}, async (input) => {
    const program = Effect.gen(function* () {
        const baseUrl = yield* Effect.sync(requireBaseUrl);
        const lab = createLabEffectClient({ baseUrl, token: getToken() });
        return yield* lab.createReceipt(input);
    }).pipe(Effect.mapError(mapHttpToError));
    const data = await Effect.runPromise(program);
    return toolJson(data);
});
async function main() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map