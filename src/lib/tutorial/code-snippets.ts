/** Raw source for Shiki — single tutorial page (+page.server.ts). */

export const TUTORIAL_INSTALL = `npm install @acoyfellow/lab`;

export const TUTORIAL_MCP_CONFIG = `{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": {
        "LAB_URL": "$LAB_URL"
      }
    }
  }
}`;

export const TUTORIAL_RUN_FROM_AGENT = `import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: process.env.LAB_URL! });

const result = await lab.runSandbox({
  body: "return 2 + 2",
  capabilities: [],
});

console.log(result.result); // 4
console.log(result.ok);     // true

// Every run saves a result:
// JSON for agents: $LAB_URL/results/\${result.resultId}.json
// Viewer for humans: $LAB_URL/results/\${result.resultId}`;

export const TUTORIAL_RUN_CURL = `curl -X POST $LAB_URL/run \\
  -H 'Content-Type: application/json' \\
  -d '{"body":"return 2 + 2","capabilities":[]}'`;

export const TUTORIAL_FETCH_RESULT = `curl -s "$LAB_URL/results/$RESULT_ID.json" | jq .`;
