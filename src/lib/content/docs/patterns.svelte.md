# Patterns

Five workflows agents build with Lab. Each one turns "it works" into a URL someone else can verify.

---

## Prove it

An agent claims a function handles edge cases. Instead of asserting, it runs every case and returns a verdict. Ship the receipt, not "trust me."

```js
const out = await lab.runChain([
  {
    name: "Spec",
    body: `return {
      cases: [
        { input: "$1,234.56", expected: 1234.56 },
        { input: "free",       expected: null },
        { input: null,         expected: null },
      ],
    };`,
    capabilities: []
  },
  {
    name: "Implement + test",
    body: `function parseAmount(raw) {
      if (!raw) return null;
      const n = parseFloat(String(raw).replace(/[^\d.\-]/g, ""));
      return Number.isNaN(n) ? null : Math.round(n * 100) / 100;
    }
    return input.cases.map((c) => {
      const actual = parseAmount(c.input);
      return { ...c, actual, pass: actual === c.expected };
    });`,
    capabilities: []
  },
  {
    name: "Verdict",
    body: `return {
      verdict: input.every((r) => r.pass) ? "PASS" : "FAIL",
      score: input.filter((r) => r.pass).length + "/" + input.length,
    };`,
    capabilities: []
  },
]);
```

Use it before shipping generated code, claiming correctness, or handing work to a reviewer.

[Run it →](/examples)

---

## Self-heal

A step fails. The agent reads the error, applies a fix, retries — all in one run. The receipt records the failure path *and* the repair, so the next agent (or you, tomorrow) can see what happened.

```js
const out = await lab.runChain([
  {
    name: "Try parse",
    body: `try {
      return { ok: true, data: JSON.parse(input.raw) };
    } catch (e) {
      return { ok: false, error: e.message, raw: input.raw };
    }`,
    capabilities: []
  },
  {
    name: "Heal",
    body: `if (input.ok) return input;
    const fixed = input.raw
      .replace(/(\w+):/g, '"$1":')           // unquoted keys
      .replace(/,\s*([}\]])/g, '$1');        // trailing commas
    return { ok: true, data: JSON.parse(fixed), healed: true };`,
    capabilities: []
  },
]);
```

Use it for unreliable parses, flaky upstream APIs, or anywhere the first try might fail in a recoverable way.

[Run it →](/examples)

---

## Handoff

Agent A finishes, returns a `resultId`. Agent B opens `/results/<id>.json` and continues from there. No queue, no shared DB — the receipt is the entire interface.

```js
// Agent A
const a = await lab.runChain([
  { name: "Research",  body: `return { findings: [...] };`, capabilities: [] },
  { name: "Reconcile", body: `return { reconciled: ..., confidence: "high" };`, capabilities: [] },
]);
return { handoffUrl: `${LAB_URL}/results/${a.resultId}.json` };

// Agent B (separate process, hours later)
const prev = await fetch(handoffUrl).then(r => r.json());
const b = await lab.runSandbox({
  body: `return formatReport(${JSON.stringify(prev.outcome.result)});`,
});
```

Use it for multi-agent pipelines: research → synthesize → publish, or plan → execute → review.

[Run it →](/examples)

---

## Canary

Old logic vs new logic, same inputs. The receipt diffs them so you (or a reviewer agent) can decide: ship, fix, or roll back.

```js
const [old, neu] = await Promise.all([
  lab.runSandbox({ body: oldLogic, capabilities: [] }),
  lab.runSandbox({ body: newLogic, capabilities: [] }),
]);
const divergence = diff(old.result, neu.result);
```

Use it before refactors, dependency upgrades, or model swaps.

[Run it →](/examples)

---

## Stress test

Run a workflow N times. If 9/10 succeed, the 1 failure's receipt tells you exactly where the ambiguity hit.

```js
const runs = await Promise.all(
  Array.from({ length: 10 }, () =>
    lab.runChain(yourPipeline)
  )
);
const passed = runs.filter(r => r.ok).length;

// Failed runs have receipt JSON — open them to see where output diverged
runs.filter(r => !r.ok).forEach(r =>
  console.log(`failed: ${LAB_URL}/results/${r.resultId}.json`)
);
```

Use it before you trust a skill in production, or before swapping to a cheaper model to find the reliability floor.

[Run it →](/examples)

---

## How agents call Lab

Same patterns, three transports:

```bash
# TypeScript client
npm install @acoyfellow/lab

# MCP (Claude Desktop, Cursor)
npx @acoyfellow/lab-mcp

# Raw HTTP
curl -X POST $LAB_URL/run/chain -H 'content-type: application/json' \
  -d '{"steps":[{"body":"return 1+1","capabilities":[]}]}'
```

Every response carries a `resultId`. Agents read `/results/:id.json`. Humans open `/results/:id`. See [HTTP API](/docs/http-api) and [TypeScript client](/docs/typescript) for the full surface.
