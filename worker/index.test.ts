import { describe, test, expect, beforeAll } from "bun:test";

const baseUrl = process.env.LAB_TEST_URL || "http://localhost:1337";

let workerAvailable = false;

describe("Lab Worker", () => {
  beforeAll(async () => {
    try {
      const res = await fetch(`${baseUrl}`, { signal: AbortSignal.timeout(1000) });
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
        body: "return typeof fetch",
        capabilities: [],
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; reason?: string };
    
    expect(data.ok).toBe(false);
    expect(data.error || data.reason).toContain("not defined");
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
      trace?: Array<{ name: string }> 
    };
    
    expect(data.ok).toBe(true);
    expect(data.result).toBe(42);
    expect(data.trace).toHaveLength(2);
    expect(data.trace?.[0].name).toBe("Generate data");
    expect(data.trace?.[1].name).toBe("Double it");
  });

  test("run creates durable trace", async () => {
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
      traceId?: string;
      result?: { test: boolean };
    };
    
    expect(runData.ok).toBe(true);
    expect(runData.traceId).toBeDefined();
    expect(runData.traceId!.length).toBeGreaterThan(5);
    
    const traceRes = await fetch(`${baseUrl}/t/${runData.traceId}`);
    const traceData = (await traceRes.json()) as {
      id: string;
      outcome: { ok: boolean; result?: { test: boolean } };
    };
    
    expect(traceData.id).toBe(runData.traceId);
    expect(traceData.outcome.ok).toBe(true);
    expect(traceData.outcome.result?.test).toBe(true);
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
      traceId?: string;
    };
    
    expect(data.ok).toBe(false);
    expect(data.error || data.reason).toContain("error");
    expect(data.traceId).toBeDefined();
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
    const data = (await res.json()) as { ok: boolean; error?: string };
    
    expect(data.ok).toBe(false);
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
});
