# Agent Patterns

Lab is built for agents. These patterns show how agents use sandboxed code and saved results to do real work — not toy demos, but workflows where "it works" becomes a URL you can verify.

Every run saves a result. For successful runs, that result can also serve as the proof artifact, handoff artifact, or review artifact.

---

## Prove It

**The core pattern.** An agent makes a claim — "this function handles edge cases." Instead of asserting, it proves.

**How it works:**

1. Agent writes the function
2. Agent writes test cases with expected outputs
3. Each test case runs in its own sandbox
4. Final step asserts every result and returns a verdict

**In a successful Prove It run, the result shows** the inputs, outputs, assertions, and final verdict. That run's URL is the proof artifact you can share.

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

// Agent's response: "Proof JSON: $LAB_URL/results/<resultId>.json"
```

**When to use:** Before shipping generated code. Before claiming correctness. Whenever "it works" needs to become "here's the receipt."

[Run this pattern →](/examples)

---

## Self-Healing Loop

An agent doesn't give up on first failure. It reads the error, diagnoses the problem, applies a fix, and retries — all within one run.

This follows the same principle as [closed-loop control systems](https://en.wikipedia.org/wiki/Closed-loop_controller): measure the output, compare it to what you wanted, feed the error back in.

**How it works:**

1. Step 1 attempts the operation (e.g., parse data)
2. Step 2 reads the error and raw input, diagnoses what's wrong
3. Step 3 applies a targeted fix based on the diagnosis
4. Step 4 validates the repair

**In a successful self-healing run, the result shows** the failure path, the repair step, and the final outcome. Depending on where execution stops, failed runs may have partial step detail.

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

Multiple agents, one run. Agent A does research. Agent B synthesizes. Agent C produces the deliverable. No message queue, no shared database — output flows forward automatically.

This is a [pipeline architecture](https://en.wikipedia.org/wiki/Pipeline_(computing)): each stage transforms data and passes it to the next.

**How it works:**

1. Each "agent" is a step in the pipeline
2. Agent A's output becomes Agent B's input automatically
3. Agent C's output is the final result
4. In a successful handoff run, the saved result shows what each step contributed

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
  }`, capabilities: [] },
]);
```

**When to use:** Multi-step workflows where different agents (or different prompts/models) handle different phases. Research-then-synthesize. Gather-then-validate. Plan-then-execute.

[Run this pattern →](/examples)

---

## Canary Deploy

Old logic vs new logic, same inputs. See exactly what changed before you ship.

Named after the [canary release](https://en.wikipedia.org/wiki/Feature_toggle#Canary_release) strategy in software deployment, but applied to code an agent wrote.

**How it works:**

1. Step 1 generates test inputs (edge cases, real data)
2. Step 2 runs the **old** logic against all inputs
3. Step 3 runs the **new** logic against the same inputs
4. Step 4 diffs the outputs

**In a successful canary run, the result shows** the inputs where v1 and v2 disagree. An agent (or human) reviews the diffs and decides: ship it, fix it, or roll back.

**When to use:** Refactoring. Upgrading a dependency. Any time "it should behave the same" needs verification.

[Run this pattern →](/examples)

---

## Stress Test

You wrote a skill, a prompt, or a pipeline. It works once. But does it work reliably? And does it work because your instructions are clear, or because the model is smart enough to guess what you meant?

This applies the same idea as [minimax](https://en.wikipedia.org/wiki/Minimax) in game theory: assume the worst case and see if things still hold. In games, that means assuming your opponent plays perfectly. Here, it means assuming the model is as dumb as possible.

**How it works:**

1. Run your pipeline N times, collect results
2. Check: did every run produce the same (correct) output?
3. If not, read the failing results — they show exactly where the ambiguity hit
4. Fix the instructions, run again
5. Once it's reliable, try with a smaller/cheaper model to find the floor

```ts
const lab = createLabClient({ baseUrl: process.env.LAB_URL });

const results = [];

for (let i = 0; i < 10; i++) {
  const out = await lab.runChain([
    { name: "Generate", body: `
      // your skill/prompt logic here
      return parseUserInput("$1,234.56");
    `, capabilities: [] },
    { name: "Verify", body: `
      const expected = 1234.56;
      return {
        run: ${i + 1},
        output: input,
        pass: input === expected,
      };
    `, capabilities: [] },
  ]);

  results.push({
    run: i + 1,
    pass: out.result?.pass,
    resultId: out.resultId,
  });
}

const passed = results.filter(r => r.pass).length;
console.log(`${passed}/10 passed`);

// Failed runs have saved-result JSON — read it to see where the output diverged
results.filter(r => !r.pass).forEach(r =>
  console.log(`Run ${r.run} failed: $LAB_URL/results/${r.resultId}.json`)
);
```

You can extend this with an evolutionary approach — generate multiple candidate implementations, evaluate each against the same test cases, select the winner by score. One run = one generation. Feed the winner back as the starting point for the next round. This is the same idea behind [genetic algorithms](https://en.wikipedia.org/wiki/Genetic_algorithm): mutate, evaluate, select, repeat.

**When to use:** Before you trust a skill in production. Before you optimize for cost by switching to a smaller model. Any time "it worked once" isn't good enough.

[Run this pattern →](/examples)

---

## Combining Patterns

The real power is composition. An agent might:

1. **Prove It** to verify code handles edge cases
2. **Stress Test** to make sure it's reliable, not lucky
3. **Hand off** the results to a review agent
4. **Compare** the new logic against the old before shipping

Each run saves a result. Successful runs can link together into a reviewable story for an agent or human to follow.

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
      "env": { "LAB_URL": "https://your-lab.example" }
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
curl -X POST $LAB_URL/run/chain \
  -H 'Content-Type: application/json' \
  -d '{"steps":[{"body":"return 1+1","capabilities":[]}]}'
```

The `resultId` in the response identifies the artifact. Agents read `/results/:id.json`. Humans open `/results/:id`. The rest is transport.
