/** Raw source for Shiki — tutorial steps (+page.server.ts). */

export const TUTORIAL_STEP1_CODE = `import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: process.env.LAB_URL! });

const out = await lab.runSandbox({
  body: "return 2 + 2",
  capabilities: [],
});

console.log(out.result); // 4
console.log(out.traceId); // clu01abc...

// View the trace at:
// $LAB_URL/t/\${out.traceId}`;

export const TUTORIAL_STEP1_CURL = `curl -X POST $LAB_URL/run \\
  -H 'Content-Type: application/json' \\
  -d '{"body":"return 2 + 2","capabilities":[]}'`;

export const TUTORIAL_STEP2_CODE = `import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: process.env.LAB_URL! });

const out = await lab.runChain([
  {
    name: "Generate numbers",
    body: "return [1, 2, 3]",
    capabilities: [],
  },
  {
    name: "Count items",
    body: "return input.length",
    capabilities: [],
  },
  {
    name: "Format result",
    body: 'return { count: input, items: "1, 2, 3" }',
    capabilities: [],
  },
]);

console.log(out.result); // { count: 3, items: "1, 2, 3" }
console.log(out.traceId); // clu01abc...`;

export const TUTORIAL_STEP2_CURL = `curl -X POST $LAB_URL/run/chain \\
  -H 'Content-Type: application/json' \\
  -d '{"steps":[{"body":"return [1,2,3]","capabilities":[]},{"body":"return input.length","capabilities":[]}]}'`;

export const TUTORIAL_STEP3_LAB_CLIENT = `import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: process.env.LAB_URL! });

const out = await lab.runChain([
  { body: "return [1,2,3]", capabilities: [] },
  { body: "return input.reduce((a, n) => a + n, 0)", capabilities: [] },
]);

console.log(out.traceId, out.result);`;

export const TUTORIAL_STEP3_FETCH_TRACE = `curl -s "$LAB_URL/t/$TRACE_ID.json" | jq .`;
