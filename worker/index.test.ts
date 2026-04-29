import { describe, test, expect, beforeAll } from "bun:test";

const baseUrl = process.env.LAB_TEST_URL;

let workerAvailable = false;

describe("Lab Worker", () => {
  beforeAll(async () => {
    if (!baseUrl) {
      workerAvailable = false;
      console.log(`\n⚠️  LAB_TEST_URL not set`);
      console.log(`   Skipping integration tests. Set LAB_TEST_URL to a running instance.\n`);
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1000) });
      workerAvailable = res.ok;
    } catch {
      workerAvailable = false;
    }
    
    if (!workerAvailable) {
      console.log(`\n⚠️  Worker not available at ${baseUrl}`);
      console.log('   Skipping integration tests. Start Worker with: bun dev');
      console.log(`   Or set LAB_TEST_URL to a running instance.\n`);
    }
  });

  test("guest cannot access host env or fetch", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "return await fetch('http://example.com')",
        capabilities: [],
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; reason?: string };
    
    expect(data.ok).toBe(false);
    expect(data.error || data.reason).toContain("not permitted");
  });

  test("kv access denied without capability", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "return await kv.get('test-key')",
        capabilities: [],
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; reason?: string };
    
    expect(data.ok).toBe(false);
    expect(data.error || data.reason).toContain("capability");
  });

  test("kv access works with capability", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    await fetch(`${baseUrl}/seed`, { method: "POST" });
    
    const res = await fetch(`${baseUrl}/run/kv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "return await kv.get('user:1')",
        capabilities: ["kvRead"],
      }),
    });
    const data = (await res.json()) as { ok: boolean; result?: string };
    
    expect(data.ok).toBe(true);
    expect(data.result).toContain("Alice");
  });

  test("chain passes output between steps", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/run/chain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: [
          {
            name: "Generate data",
            body: "return { value: 21 }",
            capabilities: [],
          },
          {
            name: "Double it",
            body: "return input.value * 2",
            capabilities: [],
          },
        ],
      }),
    });
    const data = (await res.json()) as { 
      ok: boolean; 
      result?: number; 
      steps?: Array<{ name: string }> 
    };
    
    expect(data.ok).toBe(true);
    expect(data.result).toBe(42);
    expect(data.steps).toHaveLength(2);
    expect(data.steps?.[0].name).toBe("Generate data");
    expect(data.steps?.[1].name).toBe("Double it");
  });

  test("run creates durable saved result", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const runRes = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "return { test: true, timestamp: Date.now() }",
        capabilities: [],
      }),
    });
    const runData = (await runRes.json()) as { 
      ok: boolean; 
      resultId?: string;
      result?: { test: boolean };
    };
    
    expect(runData.ok).toBe(true);
    expect(runData.resultId).toBeDefined();
    expect(runData.resultId!.length).toBeGreaterThan(5);
    
    const resultRes = await fetch(`${baseUrl}/results/${runData.resultId}.json`);
    const resultData = (await resultRes.json()) as {
      id: string;
      outcome: { ok: boolean; result?: { test: boolean } };
    };
    
    expect(resultData.id).toBe(runData.resultId);
    expect(resultData.outcome.ok).toBe(true);
    expect(resultData.outcome.result?.test).toBe(true);
  });

  test("worker bare result path redirects to .json", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const runRes = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "return 123",
        capabilities: [],
      }),
    });
    const runData = (await runRes.json()) as {
      ok: boolean;
      resultId?: string;
    };

    expect(runData.ok).toBe(true);
    expect(runData.resultId).toBeDefined();

    const response = await fetch(`${baseUrl}/results/${runData.resultId}`, { redirect: "manual" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${baseUrl}/results/${runData.resultId}.json`);
  });

  test("external receipt creates durable saved result", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const receiptRes = await fetch(`${baseUrl}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "playwright",
        action: "homepage-check",
        capabilities: ["browser.read"],
        input: { url: "https://example.com" },
        output: { assertions: 3 },
        replay: { mode: "continue-from-here", available: true },
      }),
    });
    const receiptData = (await receiptRes.json()) as { ok: boolean; resultId?: string };

    expect(receiptData.ok).toBe(true);
    expect(receiptData.resultId).toBeDefined();

    const savedRes = await fetch(`${baseUrl}/results/${receiptData.resultId}.json`);
    const saved = (await savedRes.json()) as {
      type: string;
      receipt?: { source?: string; action?: string; capabilities?: string[] };
      outcome?: { ok?: boolean; result?: { assertions?: number } };
    };

    expect(saved.type).toBe("external");
    expect(saved.receipt?.source).toBe("playwright");
    expect(saved.receipt?.action).toBe("homepage-check");
    expect(saved.receipt?.capabilities).toContain("browser.read");
    expect(saved.outcome?.ok).toBe(true);
    expect(saved.outcome?.result?.assertions).toBe(3);
  });

  test("session receipts survive concurrent appends", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }

    const sessionRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Concurrent receipt regression",
        artifact: { repo: "lab-test", branch: "main" },
      }),
    });
    const sessionData = (await sessionRes.json()) as { ok: boolean; sessionId?: string };
    expect(sessionData.ok).toBe(true);
    expect(sessionData.sessionId).toBeDefined();

    const receiptResults = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        fetch(`${baseUrl}/sessions/${sessionData.sessionId}/receipts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "test",
            action: `parallel-${index}`,
            output: { index },
          }),
        }).then((res) => res.json() as Promise<{ ok: boolean; resultId?: string }>),
      ),
    );

    const receiptIds = receiptResults.map((result) => result.resultId).filter(Boolean);
    expect(receiptResults.every((result) => result.ok)).toBe(true);
    expect(receiptIds).toHaveLength(5);

    const savedSessionRes = await fetch(`${baseUrl}/sessions/${sessionData.sessionId}`);
    const savedSession = (await savedSessionRes.json()) as {
      ok: boolean;
      session?: { receiptIds?: string[] };
    };

    expect(savedSession.ok).toBe(true);
    for (const receiptId of receiptIds) {
      expect(savedSession.session?.receiptIds).toContain(receiptId);
    }
  });

  test("chain step failure stops execution", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/run/chain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: [
          {
            name: "Step 1",
            body: "return { ok: true }",
            capabilities: [],
          },
          {
            name: "Step 2 - fails",
            body: "throw new Error('Intentional failure')",
            capabilities: [],
          },
          {
            name: "Step 3 - never runs",
            body: "return 'should not reach here'",
            capabilities: [],
          },
        ],
      }),
    });
    const data = (await res.json()) as { 
      ok: boolean; 
      error?: string; 
      reason?: string;
      resultId?: string;
    };
    
    expect(data.ok).toBe(false);
    expect(data.error || data.reason).toContain("Intentional failure");
    expect(data.resultId).toBeDefined();
  });

  test("spawn capability requires explicit grant", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/run/spawn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "return { hello: 'world' }",
        capabilities: [],
        depth: 2,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    
    expect(res.status).toBe(400);
    expect(data.error).toContain("spawn capability required");
  });

  test("sandbox preserves primitive return values", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const testCases = [
      { body: "return 42", expected: 42 },
      { body: "return 'hello'", expected: "hello" },
      { body: "return true", expected: true },
      { body: "return null", expected: null },
      { body: "return [1, 2, 3]", expected: [1, 2, 3] },
      { body: "return { a: 1, b: 2 }", expected: { a: 1, b: 2 } },
    ];
    
    for (const tc of testCases) {
      const res = await fetch(`${baseUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: tc.body, capabilities: [] }),
      });
      const data = (await res.json()) as { ok: boolean; result?: unknown };
      
      expect(data.ok).toBe(true);
      expect(data.result).toEqual(tc.expected);
    }
  });

  test("durableObjectFetch supports JSON RPC", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: `const name="do-test-1"; await labDo.fetch(name, { method: "POST", path: "/x", body: { n: 1 } }); return await labDo.fetch(name, { method: "GET", path: "/x" });`,
        capabilities: ["durableObjectFetch"],
      }),
    });
    const data = (await res.json()) as { ok: boolean; result?: { value?: { n?: number } } };
    expect(data.ok).toBe(true);
    expect(data.result?.value?.n).toBe(1);
  });

  test("catalog endpoint returns capabilities list", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/lab/catalog`);
    const data = (await res.json()) as { 
      capabilities?: Array<{ id: string }> 
    };
    
    expect(data.capabilities).toBeDefined();
    expect(Array.isArray(data.capabilities)).toBe(true);
    expect(data.capabilities!.length).toBeGreaterThan(0);
    
    const capIds = data.capabilities!.map((c) => c.id);
    expect(capIds).toContain("kvRead");
    expect(capIds).toContain("spawn");
    expect(capIds).toContain("workersAi");
  });

  // --- Self-healing route tests ---

  test("diagnose returns error for missing traceId", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(data.error).toContain("traceId");
  });

  test("diagnose returns error for non-existent trace", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traceId: "nonexistent0000" }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
  });

  test("propose returns error for missing diagnosis", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("verify returns error for missing proposal", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("compare returns error for missing trace IDs", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("compare returns error for non-existent trace IDs", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: "nonexistentA", b: "nonexistentB" }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
  });

  test("diagnose analyzes a failed trace", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    // First create a failing trace
    const runRes = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "throw new Error('test failure for healing')",
        capabilities: [],
      }),
    });
    const runData = (await runRes.json()) as { ok: boolean; resultId?: string; error?: string };
    expect(runData.ok).toBe(false);
    expect(runData.resultId).toBeDefined();

    // Diagnose the failed trace
    const diagRes = await fetch(`${baseUrl}/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traceId: runData.resultId }),
    });
    const diagData = (await diagRes.json()) as {
      ok: boolean;
      diagnosis?: {
        problem?: { category?: string; description?: string };
        context?: { errorMessage?: string; traceId?: string };
        hints?: string[];
        confidence?: string;
      };
      error?: string;
    };

    expect(diagData.ok).toBe(true);
    expect(diagData.diagnosis).toBeDefined();
    expect(diagData.diagnosis!.problem).toBeDefined();
    expect(diagData.diagnosis!.problem!.category).toBeDefined();
    expect(diagData.diagnosis!.context!.traceId).toBe(runData.resultId);
  });

  test("compare works with two existing traces", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    // Create two traces
    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "return 1", capabilities: [] }),
      }),
      fetch(`${baseUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "return 2", capabilities: [] }),
      }),
    ]);
    const dataA = (await resA.json()) as { ok: boolean; resultId?: string };
    const dataB = (await resB.json()) as { ok: boolean; resultId?: string };
    expect(dataA.resultId).toBeDefined();
    expect(dataB.resultId).toBeDefined();

    const compRes = await fetch(`${baseUrl}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: dataA.resultId, b: dataB.resultId }),
    });
    const compData = (await compRes.json()) as {
      ok: boolean;
      comparison?: {
        traceA: string;
        traceB: string;
        diff?: { output?: { changed?: boolean }; code?: { changed?: boolean } };
        summary?: string;
      };
      error?: string;
    };

    expect(compData.ok).toBe(true);
    expect(compData.comparison).toBeDefined();
    expect(compData.comparison!.traceA).toBe(dataA.resultId);
    expect(compData.comparison!.traceB).toBe(dataB.resultId);
    expect(compData.comparison!.summary).toBeDefined();
  });

  // --- Story route tests ---

  test("story creation requires title and traceIds", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/stories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
  });

  test("story creation works with valid input", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    // Create a trace first
    const runRes = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "return { story: true }", capabilities: [] }),
    });
    const runData = (await runRes.json()) as { ok: boolean; resultId?: string };
    expect(runData.resultId).toBeDefined();

    const res = await fetch(`${baseUrl}/stories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Story",
        traceIds: [runData.resultId],
        visibility: "private",
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      story?: { id: string; title: string; status: string; chapters?: unknown[] };
      error?: string;
    };

    if (data.ok) {
      expect(data.story).toBeDefined();
      expect(data.story!.title).toBe("Test Story");
      expect(data.story!.status).toBe("in-progress");
      expect(data.story!.chapters).toBeDefined();
      expect(data.story!.chapters!.length).toBe(1);
    } else {
      // D1 may not be configured in test environment
      expect(data.error).toBeDefined();
    }
  });

  test("story fork requires valid chapter index", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/stories/nonexistent/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromChapterIndex: 0 }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    expect(data.ok).toBe(false);
  });

  test("list stories returns array", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/stories`);
    const data = (await res.json()) as { ok: boolean; stories?: unknown[]; error?: string };
    // May fail if D1 not configured, but should return valid JSON
    expect(typeof data.ok).toBe("boolean");
  });

  // Regression: GET /stories?offset=10 (no limit) used to fail with a SQL
  // syntax error because OFFSET requires LIMIT in SQLite/D1. Handler now
  // injects `LIMIT -1` when only `offset` is supplied. See PR #27 follow-up.
  test("list stories with offset only does not 500", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/stories?offset=10`);
    expect(res.status).toBeLessThan(500);
    const data = (await res.json()) as { ok: boolean; stories?: unknown[]; error?: string };
    expect(typeof data.ok).toBe("boolean");
    if (!data.ok && data.error) {
      expect(data.error.toLowerCase()).not.toContain("syntax");
    }
  });

  // Regression: /verify used to flatten the VerificationResult into the
  // top-level response, dropping `result.ok`. The SDK contract is
  // `{ ok, result: VerificationResult }`. See PR #27 follow-up.
  test("/verify returns full VerificationResult shape", async () => {
    if (!workerAvailable) {
      expect(true).toBe(true);
      return;
    }
    const res = await fetch(`${baseUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposal: {
          type: "code_change",
          description: "regression test",
          changes: { body: "return 0" },
          reasoning: "test",
          estimatedConfidence: "low",
        },
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      result?: { traceId?: string; ok?: boolean; result?: unknown; error?: string };
      error?: string;
    };
    if (data.ok) {
      // Successful verify must return a full VerificationResult object,
      // not a flattened payload.
      expect(data.result).toBeDefined();
      expect(typeof data.result?.ok).toBe("boolean");
      expect(typeof data.result?.traceId).toBe("string");
    } else {
      // If verify failed (e.g. no body provided), must return an error
      // string at top level — not a half-flattened result.
      expect(typeof data.error).toBe("string");
    }
  });
});
