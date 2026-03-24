<script lang="ts">
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import { signIn, signOut, signUp } from '$lib/auth-client';
  import { runSandbox, runKv, runChain, runSpawn, runGenerate, seedKv } from './data.remote';

  type SecondaryTabName = 'sandbox' | 'kv' | 'generate' | 'spawn';

  type CapBadge = { name: string; on: boolean };

  type ChainStep = { name: string; code: string; capabilities: string[] };

  type TraceEntry = {
    step: number;
    name?: string;
    capabilities: string[];
    input: unknown;
    output: unknown;
    ms: number;
  };

  const INITIAL_CHAIN_STEPS: ChainStep[] = [
    {
      name: 'Reader',
      code: "const keys = await kv.list('user:');\nconst users = [];\nfor (const key of keys) {\n  const raw = await kv.get(key);\n  users.push(JSON.parse(raw));\n}\nreturn users;",
      capabilities: ['kvRead'],
    },
    {
      name: 'Validator',
      code: "const admins = input.filter(u => u.role === 'admin');\nif (!Array.isArray(admins)) {\n  throw new Error('Invalid input: expected array');\n}\nfor (const admin of admins) {\n  if (!admin.name || !admin.role) {\n    throw new Error('Invalid user shape');\n  }\n}\nreturn admins;",
      capabilities: [],
    },
    {
      name: 'Formatter',
      code: "const names = input.map(u => u.name);\nreturn `Found ${input.length} admin(s): ${names.join(', ')}`;",
      capabilities: [],
    },
  ];

  const tabDefs: Record<
    SecondaryTabName,
    {
      code?: string;
      caps: CapBadge[];
      meta: string;
      isGenerate?: boolean;
      isSpawn?: boolean;
    }
  > = {
    sandbox: {
      code: `// No capabilities granted.\n// The isolate cannot access the network, storage, or any external service.\n// Use \`return\` to produce output.\n\nreturn { sum: [1,2,3].reduce((a,b) => a+b, 0) };`,
      caps: [{ name: 'network', on: false }, { name: 'kv read', on: false }, { name: 'kv write', on: false }],
      meta: 'Runs in a V8 isolate with no outbound access.',
    },
    kv: {
      code: `// This isolate can read from KV.\n// \`kv.get(key)\` returns a string or null.\n// \`kv.list(prefix)\` returns an array of keys.\n// Click "Seed KV" first to populate demo data.\n\nconst keys = await kv.list("user:");\nconst users = [];\nfor (const key of keys) {\n  const raw = await kv.get(key);\n  users.push(JSON.parse(raw));\n}\nreturn { users };`,
      caps: [{ name: 'network', on: false }, { name: 'kv read', on: true }, { name: 'kv write', on: false }],
      meta: 'KV data is snapshot before the isolate starts. The isolate reads from memory, not from KV directly.',
    },
    spawn: {
      code: `// This isolate can create child isolates.\n// \`spawn(code, capabilities)\` runs code in a new isolate.\n// Children cannot spawn (depth decrements to 0).\n\nconst results = await Promise.all([\n  spawn("return { id: 1, sq: 10 * 10 }", []),\n  spawn("return { id: 2, sq: 20 * 20 }", []),\n  spawn("return { id: 3, sq: 30 * 30 }", []),\n]);\n\nreturn { parent: "orchestrator", children: results };`,
      caps: [{ name: 'spawn', on: true }, { name: 'network', on: false }, { name: 'kv read', on: false }],
      meta: 'Children receive depth - 1. At depth 0, spawn is unavailable.',
      isSpawn: true,
    },
    generate: {
      caps: [],
      meta: 'Workers AI writes the code. The generated code runs in a sandboxed isolate with the declared capabilities.',
      isGenerate: true,
    },
  };

  const secondaryTabOrder: SecondaryTabName[] = ['sandbox', 'kv', 'generate', 'spawn'];

  let chainSteps = $state<ChainStep[]>(INITIAL_CHAIN_STEPS.map((s) => ({ ...s, capabilities: [...s.capabilities] })));

  let advancedTab = $state<SecondaryTabName>('sandbox');
  let code = $state(tabDefs.sandbox.code ?? '');
  let output = $state('\u2014');
  let traceId = $state<string | null>(null);
  let traceEntries = $state<TraceEntry[]>([]);
  let generatedCode = $state('');
  let genPrompt = $state('Generate the first 20 fibonacci numbers and return them as an array');
  let genKvRead = $state(false);
  let isRunning = $state(false);
  let lastTraceSummary = $state<string | null>(null);
  /** 'main' = chain composer; 'advanced' = secondary modes */
  let lastRunSurface = $state<'main' | 'advanced'>('main');

  let authEmail = $state('');
  let authPassword = $state('');
  let authLoading = $state(false);
  let showAuthForm = $state(false);

  async function handleSignIn() {
    if (!authEmail.trim() || !authPassword.trim()) return;
    authLoading = true;
    try {
      const result = await signIn.email({ email: authEmail, password: authPassword });
      if (result.error) { alert(result.error.message); return; }
      authEmail = ''; authPassword = ''; showAuthForm = false;
      await invalidateAll();
    } catch (e: any) { alert('Sign in failed: ' + e.message); }
    finally { authLoading = false; }
  }

  async function handleSignUp() {
    if (!authEmail.trim() || !authPassword.trim()) return;
    if (authPassword.length < 6) { alert('Password must be at least 6 characters'); return; }
    authLoading = true;
    try {
      const result = await signUp.email({ email: authEmail, password: authPassword, name: authEmail.split('@')[0] });
      if (result.error) { alert(result.error.message); return; }
      authEmail = ''; authPassword = ''; showAuthForm = false;
      await invalidateAll();
    } catch (e: any) { alert('Sign up failed: ' + e.message); }
    finally { authLoading = false; }
  }

  async function handleSignOut() {
    await signOut();
    await invalidateAll();
  }

  function switchAdvancedTab(name: SecondaryTabName) {
    advancedTab = name;
    const tab = tabDefs[name];
    if (!tab.isGenerate && tab.code) {
      code = tab.code;
    }
    output = '\u2014';
    traceId = null;
    traceEntries = [];
    generatedCode = '';
    lastTraceSummary = null;
  }

  function formatData(data: unknown): string {
    if (data === undefined) return 'undefined';
    if (data === null) return 'null';
    const str = JSON.stringify(data, null, 2);
    return str.length > 300 ? str.substring(0, 300) + '\u2026' : str;
  }

  function toggleStepKv(index: number, on: boolean) {
    chainSteps = chainSteps.map((s, i) => {
      if (i !== index) return s;
      const capabilities = on
        ? [...new Set([...s.capabilities, 'kvRead'])]
        : s.capabilities.filter((c) => c !== 'kvRead');
      return { ...s, capabilities };
    });
  }

  function addChainStep() {
    const n = chainSteps.length + 1;
    chainSteps = [
      ...chainSteps,
      { name: `Step ${n}`, code: 'return input;', capabilities: [] },
    ];
  }

  function removeChainStep(index: number) {
    chainSteps = chainSteps.filter((_, i) => i !== index);
  }

  function moveChainStep(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= chainSteps.length) return;
    const next = [...chainSteps];
    const t = next[index]!;
    next[index] = next[j]!;
    next[j] = t;
    chainSteps = next;
  }

  async function runChainMain() {
    lastRunSurface = 'main';
    isRunning = true;
    output = 'Running chain\u2026';
    traceId = null;
    traceEntries = [];
    generatedCode = '';
    lastTraceSummary = null;

    try {
      const t0 = performance.now();
      const stepsPayload = chainSteps.map((s) => ({
        name: s.name.trim() || undefined,
        code: s.code,
        capabilities: [...s.capabilities],
      }));
      const result = await runChain(stepsPayload);
      const ms = (performance.now() - t0).toFixed(1);

      if (result.traceId) traceId = result.traceId;
      if (result.trace) traceEntries = result.trace;

      if (result.ok && result.trace?.length) {
        lastTraceSummary = `${result.trace.length} step(s) · ${ms} ms · ok`;
      } else if (result.ok) {
        lastTraceSummary = `${ms} ms · ok`;
      } else {
        lastTraceSummary = `${ms} ms · error`;
      }

      output = JSON.stringify(result, null, 2);
    } catch (err: any) {
      output = 'Error: ' + (err.message || String(err));
      lastTraceSummary = null;
    } finally {
      isRunning = false;
    }
  }

  async function runAdvanced() {
    const tab = tabDefs[advancedTab];
    lastRunSurface = 'advanced';
    isRunning = true;
    output = 'Running\u2026';
    traceId = null;
    traceEntries = [];
    generatedCode = '';
    lastTraceSummary = null;

    try {
      const t0 = performance.now();
      let result: any;

      if (tab.isGenerate) {
        output = 'Generating\u2026';
        const caps = genKvRead ? ['kvRead'] : [];
        result = await runGenerate({ prompt: genPrompt, capabilities: caps });
      } else if (tab.isSpawn) {
        output = 'Spawning isolates\u2026';
        result = await runSpawn({ code, capabilities: ['spawn'], depth: 2 });
      } else if (advancedTab === 'kv') {
        result = await runKv(code);
      } else {
        result = await runSandbox(code);
      }

      const ms = (performance.now() - t0).toFixed(1);

      if (result.traceId) traceId = result.traceId;
      if (result.trace) traceEntries = result.trace;
      if (result.generated) generatedCode = result.generated;

      if (tab.isGenerate) {
        const lines: string[] = [];
        if (result.ok) {
          lines.push(JSON.stringify({ ok: true, result: result.result }, null, 2));
        } else {
          lines.push(JSON.stringify({ ok: false, error: result.error, reason: result.reason }, null, 2));
        }
        if (result.generateMs !== undefined) {
          lines.push('', `generate: ${result.generateMs} ms, run: ${result.runMs} ms`);
        }
        output = lines.join('\n');
        lastTraceSummary = result.traceId ? `${ms} ms · ${result.ok ? 'ok' : 'error'}` : null;
      } else {
        output = JSON.stringify(result, null, 2) + '\n\n' + ms + ' ms';
        lastTraceSummary = result.traceId ? `${ms} ms · ${result.ok !== false ? 'ok' : 'error'}` : null;
      }
    } catch (err: any) {
      output = 'Error: ' + (err.message || String(err));
      lastTraceSummary = null;
    } finally {
      isRunning = false;
    }
  }

  async function seed() {
    output = 'Seeding\u2026';
    traceId = null;
    lastTraceSummary = null;
    try {
      const result = await seedKv(undefined);
      output = JSON.stringify(result, null, 2);
    } catch (err: any) {
      output = 'Error: ' + (err.message || String(err));
    }
  }

  function copyTraceUrl() {
    if (traceId) {
      navigator.clipboard.writeText(window.location.origin + '/t/' + traceId);
    }
  }
</script>

<svelte:head>
  <title>lab — bounded, traceable compute</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-6 py-8 max-sm:px-4 max-sm:py-5">
  <header class="flex justify-between items-start mb-8 gap-4">
    <div>
      <h1 class="text-lg font-semibold tracking-tight">lab</h1>
      <p class="text-[color:var(--text-3)] text-[0.8125rem] mt-0.5 max-w-[42ch]">
        Primitives for orchestration of bounded, traceable compute. Compose isolates, run, share the trace.
      </p>
    </div>
    <div class="flex items-center gap-3 text-[0.8125rem]">
      <a href="https://github.com/acoyfellow/lab" target="_blank" class="text-[color:var(--text-3)] no-underline hover:text-[color:var(--text)]">GitHub &#8599;</a>
      {#if page.data.user}
        <span class="text-[color:var(--text-2)]">{page.data.user.email}</span>
        <button onclick={handleSignOut} class="text-[color:var(--text-3)] bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] px-2.5 py-1 cursor-pointer hover:text-[color:var(--text)] text-[0.8125rem] font-[family-name:var(--sans)]">Sign out</button>
      {:else}
        <button onclick={() => showAuthForm = !showAuthForm} class="text-[color:var(--text-3)] bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] px-2.5 py-1 cursor-pointer hover:text-[color:var(--text)] text-[0.8125rem] font-[family-name:var(--sans)]">Sign in</button>
      {/if}
    </div>
  </header>

  {#if showAuthForm && !page.data.user}
    <div class="mb-6 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] p-4">
      <div class="flex gap-2 items-end flex-wrap">
        <div class="flex-1 min-w-[140px]">
          <label for="auth-email" class="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-1">Email</label>
          <input id="auth-email" type="email" bind:value={authEmail} placeholder="you@example.com"
            class="w-full px-2.5 py-1.5 border border-[color:var(--border)] rounded-[var(--radius)] text-[0.8125rem] focus:outline-none focus:border-[color:var(--border-focus)]" />
        </div>
        <div class="flex-1 min-w-[140px]">
          <label for="auth-password" class="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-1">Password</label>
          <input id="auth-password" type="password" bind:value={authPassword} placeholder="••••••"
            class="w-full px-2.5 py-1.5 border border-[color:var(--border)] rounded-[var(--radius)] text-[0.8125rem] focus:outline-none focus:border-[color:var(--border-focus)]" />
        </div>
        <button onclick={handleSignIn} disabled={authLoading}
          class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-3 py-1.5 rounded-[var(--radius)] cursor-pointer bg-[color:var(--accent)] text-white border border-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50">
          {authLoading ? '...' : 'Sign in'}
        </button>
        <button onclick={handleSignUp} disabled={authLoading}
          class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-3 py-1.5 rounded-[var(--radius)] cursor-pointer bg-[color:var(--surface)] text-[color:var(--text-2)] border border-[color:var(--border)] hover:bg-[color:var(--surface-alt)] disabled:opacity-50">
          {authLoading ? '...' : 'Sign up'}
        </button>
      </div>
    </div>
  {/if}

  <!-- Primary: chain composer -->
  <section class="mb-10" aria-labelledby="chain-heading">
    <h2 id="chain-heading" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-3">Chain</h2>
    <p class="text-[color:var(--text-2)] text-[0.8125rem] mb-4 leading-relaxed">
      Each step runs in its own isolate. The previous step&apos;s return value is <code class="font-[family-name:var(--mono)] text-[0.75rem]">input</code>.
      Use <strong class="text-[color:var(--text)]">Seed KV</strong> first if a step uses <code class="font-[family-name:var(--mono)] text-[0.75rem]">kvRead</code>.
    </p>

    <div class="grid gap-4">
      {#each chainSteps as step, i (i)}
        <div class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] p-3.5">
          <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
            <input
              type="text"
              bind:value={step.name}
              class="flex-1 min-w-[120px] max-w-[200px] px-2 py-1 border border-[color:var(--border)] rounded-[var(--radius)] text-[0.8125rem] font-medium bg-[color:var(--surface-alt)]"
              placeholder="Step name"
            />
            <div class="flex gap-1 items-center">
              <button
                type="button"
                onclick={() => moveChainStep(i, -1)}
                disabled={i === 0}
                class="text-[0.75rem] px-2 py-1 rounded border border-[color:var(--border)] bg-[color:var(--surface-alt)] cursor-pointer disabled:opacity-40"
              >Up</button>
              <button
                type="button"
                onclick={() => moveChainStep(i, 1)}
                disabled={i === chainSteps.length - 1}
                class="text-[0.75rem] px-2 py-1 rounded border border-[color:var(--border)] bg-[color:var(--surface-alt)] cursor-pointer disabled:opacity-40"
              >Down</button>
              <button
                type="button"
                onclick={() => removeChainStep(i)}
                disabled={chainSteps.length <= 1}
                class="text-[0.75rem] px-2 py-1 rounded border border-[color:var(--border)] text-[color:var(--text-2)] cursor-pointer disabled:opacity-40"
              >Remove</button>
            </div>
          </div>
          <label class="flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-2)] mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={step.capabilities.includes('kvRead')}
              onchange={(e) => toggleStepKv(i, (e.currentTarget as HTMLInputElement).checked)}
            />
            kvRead
          </label>
          <textarea
            bind:value={step.code}
            class="w-full min-h-[120px] bg-[color:var(--code-bg)] text-[color:var(--code-text)] border border-[color:var(--border)] rounded-[var(--radius)] p-3 font-[family-name:var(--mono)] text-[0.8125rem] resize-y leading-relaxed focus:outline-none focus:border-[color:var(--border-focus)] max-sm:text-xs"
          ></textarea>
        </div>
      {/each}
    </div>

    <button
      type="button"
      onclick={addChainStep}
      class="mt-3 text-[0.8125rem] font-medium px-3 py-1.5 rounded-[var(--radius)] border border-dashed border-[color:var(--border)] text-[color:var(--text-2)] hover:text-[color:var(--text)] hover:bg-[color:var(--surface-alt)]"
    >+ Add step</button>

    <div class="flex gap-2 items-center flex-wrap mt-4">
      <button
        type="button"
        onclick={runChainMain}
        disabled={isRunning || chainSteps.length === 0}
        class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-4 py-[0.4375rem] rounded-[var(--radius)] cursor-pointer bg-[color:var(--accent)] text-white border border-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50"
      >
        {isRunning && lastRunSurface === 'main' ? 'Running...' : 'Run chain'}
      </button>
      <button
        type="button"
        onclick={seed}
        class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-4 py-[0.4375rem] rounded-[var(--radius)] cursor-pointer bg-[color:var(--surface)] text-[color:var(--text-2)] border border-[color:var(--border)] hover:bg-[color:var(--surface-alt)]"
      >
        Seed KV
      </button>
    </div>

    {#if traceId && lastRunSurface === 'main'}
      <div class="mt-5 p-4 rounded-[var(--radius)] border border-[color:var(--accent)] bg-[color:var(--surface)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_25%,transparent)]">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)]">Trace saved</div>
        <p class="text-[color:var(--text-2)] text-[0.8125rem] mt-1 mb-3">Share this URL for audits, reviews, or debugging.</p>
        {#if lastTraceSummary}
          <p class="text-[0.8125rem] text-[color:var(--text)] font-[family-name:var(--mono)] mb-3">{lastTraceSummary}</p>
        {/if}
        <div class="flex flex-wrap gap-2 items-center">
          <a
            href="/t/{traceId}"
            class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-[var(--radius)] bg-[color:var(--accent)] text-white border border-[color:var(--accent)] no-underline hover:bg-[color:var(--accent-hover)]"
          >Open trace</a>
          <button
            type="button"
            onclick={copyTraceUrl}
            class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-4 py-2 rounded-[var(--radius)] cursor-pointer bg-[color:var(--surface)] text-[color:var(--text-2)] border border-[color:var(--border)] hover:bg-[color:var(--surface-alt)]"
          >Copy trace URL</button>
        </div>
      </div>
    {/if}

    {#if lastRunSurface === 'main' && output !== '\u2014'}
      <details class="mt-5 group">
        <summary class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] cursor-pointer list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
          <span class="inline-block transition-transform group-open:rotate-90">&#8250;</span> Raw response
        </summary>
        <pre class="bg-[color:var(--code-bg)] border border-[color:var(--border)] rounded-[var(--radius)] p-3.5 mt-2 whitespace-pre-wrap font-[family-name:var(--mono)] text-[0.8125rem] leading-relaxed overflow-x-auto text-[color:var(--code-text)] min-h-12">{output}</pre>
      </details>

      {#if traceEntries.length > 0}
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mt-5">Step trace</div>
        {#each traceEntries as entry, idx}
          <div class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] p-3.5 mt-3">
            <div class="flex justify-between items-center mb-1.5">
              <div class="font-semibold text-[0.8125rem]">
                {entry.step + 1}. {entry.name ?? `Step ${entry.step + 1}`}
              </div>
              <div class="text-[color:var(--text-3)] text-xs font-[family-name:var(--mono)]">{entry.ms} ms</div>
            </div>
            <div class="flex gap-1.5 flex-wrap mb-2">
              {#if entry.capabilities.length > 0}
                {#each entry.capabilities as cap}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[color:var(--cap-on-bg)] text-[color:var(--cap-on-text)] border border-[color:var(--cap-on-border)]">{cap}</span>
                {/each}
              {:else}
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[color:var(--cap-off-bg)] text-[color:var(--cap-off-text)] border border-[color:var(--cap-off-border)]">none</span>
              {/if}
            </div>
            <div class="flex gap-3 max-sm:flex-col max-sm:gap-2">
              <div class="flex-1 bg-[color:var(--surface-alt)] rounded p-2.5">
                <div class="text-[0.625rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-1">Input</div>
                <div class="font-[family-name:var(--mono)] text-xs text-[color:var(--code-text)] break-all">{formatData(entry.input)}</div>
              </div>
              <div class="flex-1 bg-[color:var(--surface-alt)] rounded p-2.5">
                <div class="text-[0.625rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-1">Output</div>
                <div class="font-[family-name:var(--mono)] text-xs text-[color:var(--code-text)] break-all">{formatData(entry.output)}</div>
              </div>
            </div>
          </div>
          {#if idx < traceEntries.length - 1}
            <div class="text-center text-[color:var(--text-3)] text-base my-1">&darr;</div>
          {/if}
        {/each}
      {/if}
    {/if}
  </section>

  <!-- Secondary: other run modes -->
  <details class="mb-6 group border border-[color:var(--border)] rounded-[var(--radius)] bg-[color:var(--surface-alt)] open:bg-[color:var(--surface)]">
    <summary class="px-4 py-3 cursor-pointer text-[0.8125rem] font-medium text-[color:var(--text-2)] list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
      <span>More run modes</span>
      <span class="text-[color:var(--text-3)] text-[0.6875rem]">Sandbox, KV, Generate, Spawn</span>
    </summary>
    <div class="px-4 pb-4 pt-0 border-t border-[color:var(--border)]">
      <p class="text-[color:var(--text-3)] text-[0.75rem] mt-3 mb-3">Single-shot runs for integration tests and experiments. Chains above are the default product path.</p>

      <div class="flex border-b border-[color:var(--border)] overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {#each secondaryTabOrder as tab}
          <button
            type="button"
            class="px-3.5 py-2 text-[0.8125rem] font-medium whitespace-nowrap border-b-2 bg-transparent border-t-0 border-l-0 border-r-0 cursor-pointer transition-colors duration-150
              {advancedTab === tab
                ? 'text-[color:var(--text)] border-b-[color:var(--text)]'
                : 'text-[color:var(--text-3)] border-b-transparent hover:text-[color:var(--text-2)]'}"
            onclick={() => switchAdvancedTab(tab)}
          >
            {tab === 'kv' ? 'KV Read' : tab === 'generate' ? 'Generate' : tab === 'spawn' ? 'Spawn' : 'Sandbox'}
          </button>
        {/each}
      </div>

      {#if !tabDefs[advancedTab].isGenerate}
        <textarea
          bind:value={code}
          class="w-full h-40 bg-[color:var(--code-bg)] text-[color:var(--code-text)] border border-[color:var(--border)] rounded-[var(--radius)] p-3.5 font-[family-name:var(--mono)] text-[0.8125rem] resize-y mt-4 leading-relaxed focus:outline-none focus:border-[color:var(--border-focus)] max-sm:text-xs max-sm:h-[140px]"
        ></textarea>
      {/if}

      {#if tabDefs[advancedTab].isGenerate}
        <div class="mt-4">
          <textarea
            bind:value={genPrompt}
            placeholder="Describe what the isolate should compute..."
            class="w-full h-20 bg-[color:var(--code-bg)] text-[color:var(--text)] border border-[color:var(--border)] rounded-[var(--radius)] p-3 font-[family-name:var(--sans)] text-[0.8125rem] resize-y leading-normal focus:outline-none focus:border-[color:var(--border-focus)]"
          ></textarea>
          <div class="mt-2">
            <label class="text-[color:var(--text-2)] text-[0.8125rem] cursor-pointer mr-4">
              <input type="checkbox" bind:checked={genKvRead} class="mr-1"> KV Read
            </label>
          </div>
        </div>
      {/if}

      <div class="flex gap-2 items-center flex-wrap mt-3">
        <button
          type="button"
          onclick={runAdvanced}
          disabled={isRunning}
          class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-4 py-[0.4375rem] rounded-[var(--radius)] cursor-pointer bg-[color:var(--surface)] text-[color:var(--text)] border border-[color:var(--border)] hover:bg-[color:var(--surface-alt)] disabled:opacity-50"
        >
          {isRunning && lastRunSurface === 'advanced' ? 'Running...' : 'Run'}
        </button>
        <button
          type="button"
          onclick={seed}
          class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-4 py-[0.4375rem] rounded-[var(--radius)] cursor-pointer bg-[color:var(--surface)] text-[color:var(--text-2)] border border-[color:var(--border)] hover:bg-[color:var(--surface-alt)]"
        >
          Seed KV
        </button>
        <button
          type="button"
          onclick={copyTraceUrl}
          disabled={!traceId || lastRunSurface !== 'advanced'}
          class="font-[family-name:var(--sans)] text-[0.8125rem] font-medium px-4 py-[0.4375rem] rounded-[var(--radius)] cursor-pointer bg-[color:var(--surface)] text-[color:var(--text-2)] border border-[color:var(--border)] hover:bg-[color:var(--surface-alt)] disabled:opacity-50 disabled:cursor-default"
        >
          Copy trace URL
        </button>
        <div class="flex gap-1.5 flex-wrap items-center">
          {#each tabDefs[advancedTab].caps as cap}
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium border
              {cap.on
                ? 'bg-[color:var(--cap-on-bg)] text-[color:var(--cap-on-text)] border-[color:var(--cap-on-border)]'
                : 'bg-[color:var(--cap-off-bg)] text-[color:var(--cap-off-text)] border-[color:var(--cap-off-border)]'}"
            >
              {cap.name}
            </span>
          {/each}
        </div>
      </div>

      {#if traceId && lastRunSurface === 'advanced'}
        <div class="mt-4 p-4 rounded-[var(--radius)] border border-[color:var(--accent)] bg-[color:var(--surface)]">
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)]">Trace saved</div>
          {#if lastTraceSummary}
            <p class="text-[0.8125rem] text-[color:var(--text)] font-[family-name:var(--mono)] mt-2 mb-2">{lastTraceSummary}</p>
          {/if}
          <a
            href="/t/{traceId}"
            class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-[var(--radius)] bg-[color:var(--accent)] text-white border border-[color:var(--accent)] no-underline hover:bg-[color:var(--accent-hover)]"
          >Open trace</a>
        </div>
      {/if}

      {#if lastRunSurface === 'advanced' && output !== '\u2014'}
        <details class="mt-4 group">
          <summary class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] cursor-pointer list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
            <span class="inline-block transition-transform group-open:rotate-90">&#8250;</span> Raw response
          </summary>
          <pre class="bg-[color:var(--code-bg)] border border-[color:var(--border)] rounded-[var(--radius)] p-3.5 mt-2 whitespace-pre-wrap font-[family-name:var(--mono)] text-[0.8125rem] leading-relaxed overflow-x-auto text-[color:var(--code-text)] min-h-12">{output}</pre>
        </details>
      {/if}

      {#if generatedCode && lastRunSurface === 'advanced'}
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mt-4">Generated code</div>
        <pre class="bg-[color:var(--code-bg)] border border-[color:var(--border)] rounded-[var(--radius)] p-3 mt-1.5 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap text-[color:var(--code-text)] leading-relaxed">{generatedCode}</pre>
      {/if}

      <p class="text-[color:var(--text-3)] text-[0.6875rem] mt-3">{tabDefs[advancedTab].meta}</p>
    </div>
  </details>
</div>
