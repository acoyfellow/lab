/**
 * Smoke-test `@acoyfellow/lab` against a running lab Worker (your deploy or local).
 *
 * Default `LAB_URL`: `http://localhost:1337` (run `bun dev` first).
 * Self-hosted: `LAB_URL=https://your-worker.example bun run dogfood:lab`
 */
import { createLabClient } from '@acoyfellow/lab';

const baseUrl = process.env.LAB_URL ?? 'http://localhost:1337';
const lab = createLabClient({ baseUrl });

const sand = await lab.runSandbox('return { ok: true, sum: 1 + 2 }');
if (!sand.ok) {
  console.error('runSandbox failed:', sand);
  process.exit(1);
}

const chain = await lab.runChain([
  { code: 'return [1, 2, 3]', capabilities: [] },
  { code: 'return input.map((n: number) => n * n)', capabilities: [] },
]);
if (!chain.ok) {
  console.error('runChain failed:', chain);
  process.exit(1);
}
if (!chain.traceId) {
  console.error('runChain missing traceId (persistence / routing issue):', chain);
  process.exit(1);
}

const doc = await lab.getTrace(chain.traceId);
if (!('id' in doc) || doc.id !== chain.traceId) {
  console.error('getTrace failed or id mismatch', doc);
  process.exit(1);
}

const d1run = await lab.runChain([
  {
    code: 'return await d1.query("SELECT id, note FROM lab_demo WHERE id = 1")',
    capabilities: ['d1Read'],
  },
]);
if (!d1run.ok) {
  console.error('d1Read chain failed:', d1run);
  process.exit(1);
}

console.log('dogfood @acoyfellow/lab OK', baseUrl, {
  sandbox: sand.result,
  chain: chain.result,
  d1: d1run.result,
  traceId: chain.traceId,
});
