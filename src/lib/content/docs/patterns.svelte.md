# Agent Patterns

Lab is built for agents. These patterns show how agents use isolated execution and traces to do real work — not toy demos, but workflows that replace "trust me" with "here's the proof."

Every pattern produces a trace. The trace is always the point.

---

## Prove It

**The core pattern.** An agent makes a claim — "this function handles edge cases." Instead of asserting, it proves.

**How it works:**

1. Agent writes the function
2. Agent writes test cases with expected outputs
3. Each test case runs in an isolated step
4. Final step asserts every result and returns a verdict

**The trace shows:** every input, every output, every assertion. 10/10 pass. The trace URL is the proof — share it with a human or another agent.

```js
const out = await lab.runChain([
  { name: "Specify", body: `return {
    cases: [
      { input: "$1,234.56", expected: 1234.56 },
      { input: "free", expected: null },
      { input: null, expected: null },
    ]
  }`, capabilities: [] },
  { name: "Execute", body: `return input.cases.map(c => {
    const result = parseAmount(c.input);
    return { ...c, actual: result };
  })`, capabilities: [] },
  { name: "Assert", body: `const results = input.map(r => ({
    ...r, pass: r.actual === r.expected
  }));
  return {
    verdict: results.every(r => r.pass) ? "PASS" : "FAIL",
    score: results.filter(r => r.pass).length + "/" + results.length,
  }`, capabilities: [] },
]);

// Agent's response: "Proof: lab.coey.dev/t/<traceId>"
```

**When to use:** Before shipping generated code. Before claiming correctness. Whenever "it works" needs to become "here's the receipt."

[Run this pattern →](/examples)

---

## Self-Healing Loop

An agent doesn't give up on first failure. It reads the error, diagnoses the problem, applies a fix, and retries — all within the trace.

**How it works:**

1. Step 1 attempts the operation (e.g., parse data)
2. Step 2 reads the error and raw input, diagnoses what's wrong
3. Step 3 applies a targeted fix based on the diagnosis
4. Step 4 validates the repair

**The trace shows:** the failure, the diagnosis, the fix, the success. A human opening this trace sees the agent's *reasoning chain* — not just the final answer.

```js
const out = await lab.runChain([
  { name: "Try parse", body: `try {
    return { ok: true, data: JSON.parse(input.raw) };
  } catch(e) {
    return { ok: false, error: e.message, raw: input.raw };
  }`, capabilities: [] },
  { name: "Diagnose", body: `if (input.ok) return input;
  const issues = [];
  if (input.raw.match(/\\w+:/)) issues.push("unquoted_keys");
  if (input.raw.match(/,\\s*[}\\]]/)) issues.push("trailing_commas");
  return { ...input, issues, strategy: "apply regex fixes" };
  `, capabilities: [] },
  { name: "Heal", body: `if (input.ok) return input;
  let fixed = input.raw;
  if (input.issues.includes("unquoted_keys"))
    fixed = fixed.replace(/(\\w+):/g, '"$1":');
  if (input.issues.includes("trailing_commas"))
    fixed = fixed.replace(/,\\s*([}\\]])/g, '$1');
  return { ok: true, data: JSON.parse(fixed), healed: true };
  `, capabilities: [] },
]);
```

**When to use:** Parsing unreliable data. Handling flaky APIs. Any situation where the first attempt might fail and the agent should adapt.

[Run this pattern →](/examples)

---

## Agent Handoff

Three agents, one trace. Agent A does research. Agent B synthesizes. Agent C produces the deliverable. The trace is the coordination protocol — no message queue, no shared database.

**How it works:**

1. Each "agent" is a step in the chain
2. Agent A's output becomes Agent B's input automatically
3. Agent C's output is the final result
4. The trace shows the full relay

**The trace shows:** exactly what each agent contributed. A human or a fourth agent can read the trace and understand the entire workflow.

```js
const out = await lab.runChain([
  { name: "Agent A: Research", body: `return {
    findings: [
      { source: "API", data: { users: 1200, active: 890 } },
      { source: "DB",  data: { users: 1198, active: 887 } },
    ],
    note: "Sources roughly agree. Minor discrepancy."
  }`, capabilities: [] },
  { name: "Agent B: Reconcile", body: `const avg = {
    users: Math.round(input.findings.reduce((s,f) => s + f.data.users, 0) / input.findings.length),
    active: Math.round(input.findings.reduce((s,f) => s + f.data.active, 0) / input.findings.length),
  };
  return { reconciled: avg, sources: input.findings.length, confidence: "high" };
  `, capabilities: [] },
  { name: "Agent C: Report", body: `return {
    summary: input.reconciled.active + " active users of " + input.reconciled.users + " total",
    confidence: input.confidence,
    sources: input.sources,
    traceNote: "Open this trace to verify the data pipeline."
  }`, capabilities: [] },
]);
```

**When to use:** Multi-step workflows where different "agents" (or different prompts/models) handle different phases. Research-then-synthesize. Gather-then-validate. Plan-then-execute.

[Run this pattern →](/examples)

---

## Canary Deploy

Old logic vs new logic, same inputs. The trace shows exactly what changed before you ship.

**How it works:**

1. Step 1 generates test inputs (edge cases, real data)
2. Step 2 runs the **old** logic against all inputs
3. Step 3 runs the **new** logic against the same inputs
4. Step 4 diffs the outputs

**The trace shows:** every input where v1 and v2 disagree. An agent (or human) reviews the diffs and decides: ship it, fix it, or roll back.

**When to use:** Refactoring. Upgrading a dependency. Any time "it should behave the same" needs verification.

[Run this pattern →](/examples)

---

## Compute Offload

LLMs hallucinate math. Agents that need exact answers ship the computation to an isolate and get the result with a trace proving it.

**How it works:**

1. Agent generates the computation code
2. Lab runs it in an isolate — real V8, real math
3. Agent reads the result from the trace

**The trace shows:** the exact computation, the exact answer, the execution time. No hallucination. No approximation.

**When to use:** Arithmetic, data aggregation, sorting, filtering, regex matching — anything where "close enough" isn't good enough.

[Run this pattern →](/examples)

---

## Zero Bleed (Isolation Proof)

Prove that isolates are truly isolated. Step 1 poisons every global and prototype. Step 2 is a fresh V8. Nothing leaks.

**The trace shows:** Step 1 successfully poisoned `globalThis`, `Object.prototype`, `Array.prototype`. Step 2 checked every vector — all clean. Isolation confirmed.

**When to use:** As a trust foundation. Run this as a canary before executing untrusted agent code. Include the trace in your security documentation.

[Run this pattern →](/examples)

---

## Combining Patterns

The real power is composition. An agent might:

1. **Compute Offload** to get exact data
2. **Prove It** to verify the computation handles edge cases
3. **Agent Handoff** the trace to a review agent
4. **Canary Deploy** the new logic against the old

Each step produces a trace. The traces link together into a story that any agent or human can follow.

---

## Using Patterns from Any Agent

Lab doesn't care what agent calls it. Claude Code, a custom script, a GitHub Action, a cron job — if it can make HTTP requests or use the TypeScript client, it can use these patterns.

**TypeScript client:**
```bash
npm install @acoyfellow/lab
```

**MCP (Claude Desktop, Cursor):**
```json
{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": { "LAB_URL": "https://your-lab.workers.dev" }
    }
  }
}
```

**CLI:**
```bash
npx @acoyfellow/lab-cli chain '[{"body":"return 1+1","capabilities":[]}]'
```

**Raw HTTP:**
```bash
curl -X POST https://lab.coey.dev/run/chain \
  -H 'Content-Type: application/json' \
  -d '{"steps":[{"body":"return 1+1","capabilities":[]}]}'
```

The trace URL in the response is the artifact. Everything else is just plumbing.
