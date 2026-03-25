/** Raw source for Shiki — tutorial steps (+page.server.ts). */

export const TUTORIAL_STEP1_CURL = `curl -X POST https://lab.coey.dev/run \\
  -H 'Content-Type: application/json' \\
  -d '{"code":"return 2 + 2","capabilities":[]}'`;

export const TUTORIAL_STEP2_CURL = `curl -X POST https://lab.coey.dev/run/chain \\
  -H 'Content-Type: application/json' \\
  -d '{"steps":[{"code":"return [1,2,3]","capabilities":[]},{"code":"return input.length","capabilities":[]}]}'`;

export const TUTORIAL_STEP3_LAB_CLIENT = `import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: process.env.LAB_URL! });

const out = await lab.runChain([
  { code: "return [1,2,3]", capabilities: [] },
  { code: "return input.reduce((a, n) => a + n, 0)", capabilities: [] },
]);

console.log(out.traceId, out.result);`;

export const TUTORIAL_STEP3_FETCH_TRACE = `curl -s "$LAB_URL/t/$TRACE_ID.json" | jq .`;
