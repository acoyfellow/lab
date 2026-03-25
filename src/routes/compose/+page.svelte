<script lang="ts">
  import { onMount } from 'svelte';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
  import { runSandbox, runKv, runChain, runSpawn, runGenerate, seedKv } from '../data.remote';
  import type { ChainStep } from '@acoyfellow/lab';
  import { SIMPLE_CHAIN_STEPS } from '$lib/guest-code-fixtures';
  import {
    GUEST_TEMPLATE_DEFAULT,
    GUEST_TEMPLATE_IDS,
    type GuestTemplateId,
  } from '$lib/guest-templates';

  type Mode = 'sandbox' | 'kv' | 'chain' | 'generate' | 'spawn';

  /** Flagship: chain shows per-step trace in `/t/:id`. */
  let mode = $state<Mode>('chain');
  let guestTemplate = $state<GuestTemplateId>(GUEST_TEMPLATE_DEFAULT);
  let code = $state('return { hello: "world" }');
  let chainJson = $state(JSON.stringify(SIMPLE_CHAIN_STEPS, null, 2));
  let prompt = $state('Return the sum of 1 through 10 as a number.');
  let depth = $state(2);
  let capKvRead = $state(false);
  let capWorkersAi = $state(false);
  let capR2Read = $state(false);
  let capD1Read = $state(false);
  let capDurableObjectFetch = $state(false);
  let capContainerHttp = $state(false);
  let loading = $state(false);
  let seedMsg = $state<string | null>(null);
  let lastError = $state<string | null>(null);
  let lastTraceId = $state<string | null>(null);

  onMount(() => {
    const raw = sessionStorage.getItem('lab-fork');
    if (!raw) return;
    try {
      const f = JSON.parse(raw) as Record<string, unknown>;
      sessionStorage.removeItem('lab-fork');
      const m = f.mode;
      if (m === 'sandbox' || m === 'kv' || m === 'chain' || m === 'generate' || m === 'spawn') {
        mode = m;
      }
      if (typeof f.body === 'string') code = f.body;
      else if (typeof f.code === 'string') code = f.code;
      if (
        typeof f.template === 'string' &&
        (GUEST_TEMPLATE_IDS as readonly string[]).includes(f.template)
      ) {
        guestTemplate = f.template as GuestTemplateId;
      }
      if (typeof f.prompt === 'string') prompt = f.prompt;
      if (typeof f.depth === 'number') depth = f.depth;
      if (Array.isArray(f.capabilities)) {
        const c = f.capabilities as string[];
        capKvRead = c.includes('kvRead');
        capWorkersAi = c.includes('workersAi');
        capR2Read = c.includes('r2Read');
        capD1Read = c.includes('d1Read');
        capDurableObjectFetch = c.includes('durableObjectFetch');
        capContainerHttp = c.includes('containerHttp');
      }
      if (Array.isArray(f.steps)) {
        chainJson = JSON.stringify(f.steps, null, 2);
      }
    } catch {
      sessionStorage.removeItem('lab-fork');
    }
  });

  function guestCaps(): string[] {
    const c: string[] = [];
    if (capWorkersAi) c.push('workersAi');
    if (capR2Read) c.push('r2Read');
    if (capD1Read) c.push('d1Read');
    if (capDurableObjectFetch) c.push('durableObjectFetch');
    if (capContainerHttp) c.push('containerHttp');
    return c;
  }

  async function seed() {
    seedMsg = null;
    try {
      const r = await seedKv(undefined);
      seedMsg = r.ok ? `Seeded ${r.seeded} keys` : 'Seed failed';
    } catch (e) {
      seedMsg = e instanceof Error ? e.message : 'Seed failed';
    }
  }

  async function run() {
    loading = true;
    lastError = null;
    lastTraceId = null;
    try {
      let r;
      if (mode === 'sandbox') {
        r = await runSandbox({
          body: code,
          capabilities: guestCaps(),
          template: guestTemplate,
        });
      } else if (mode === 'kv') {
        r = await runKv({
          body: code,
          capabilities: guestCaps(),
          template: guestTemplate,
        });
      } else if (mode === 'chain') {
        let steps: ChainStep[];
        try {
          steps = JSON.parse(chainJson) as ChainStep[];
        } catch {
          throw new Error(
            'Invalid JSON in Steps. Use an array of { body, capabilities } objects — see the HTTP API docs for examples.',
          );
        }
        if (!Array.isArray(steps)) throw new Error('Chain JSON must be an array of steps');
        r = await runChain(steps);
      } else if (mode === 'generate') {
        const capabilities: string[] = [...guestCaps()];
        if (capKvRead) capabilities.push('kvRead');
        r = await runGenerate({ prompt, capabilities, template: guestTemplate });
      } else {
        r = await runSpawn({
          body: code,
          capabilities: ['spawn', ...guestCaps()],
          depth,
          template: guestTemplate,
        });
      }

      if (r.traceId) {
        lastTraceId = r.traceId;
      }
      if (!r.ok) {
        lastError = JSON.stringify(
          { error: r.error, reason: r.reason },
          null,
          2,
        );
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
</script>

<SEO
  title="Compose — lab"
  description="Run code in sandbox/KV/chain/spawn/generate modes and get a shareable trace ID for every execution."
  path="/compose"
  type="website"
/>

<div class="max-w-3xl mx-auto px-5 py-8 pb-16">
  <header class="mb-6">
    <h1 class="text-lg font-semibold tracking-tight">Compose</h1>
    <p class="text-[0.8125rem] text-(--text-2) mt-1 max-w-[56ch] leading-relaxed">
      <strong class="text-(--text) font-medium">Start with Chain</strong> (default): two steps, per-step trace on
      <code class="font-(family-name:--mono) text-[0.75rem]">/t/:id</code>. Other modes below. Successful runs return a
      <code class="font-(family-name:--mono) text-[0.75rem]">traceId</code>.
      Checkboxes add optional <strong class="text-(--text) font-medium">host-invoke</strong> caps (<code class="text-[0.7rem]">workersAi</code>,
      <code class="text-[0.7rem]">r2Read</code>, …); Generate mode can also grant <code class="text-[0.7rem]">kvRead</code> to emitted code.
      Chain steps carry their own <code class="text-[0.7rem]">capabilities</code> (and optional per-step <code class="text-[0.7rem]">template</code>) in JSON.
      <AppLink to={paths.docsHttpApi} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>
      &middot;
      <AppLink to={paths.docsCapabilities} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Capability matrix</AppLink>.
    </p>
  </header>

  <div class="space-y-4">
    <div>
      <label for="compose-mode" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Mode</label>
      <select
        id="compose-mode"
        bind:value={mode}
        class="w-full max-w-xs border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem] text-(--text)"
      >
        <option value="chain">Chain (POST /run/chain) — recommended</option>
        <option value="sandbox">Sandbox (POST /run)</option>
        <option value="kv">KV read (POST /run/kv)</option>
        <option value="generate">Generate (POST /run/generate)</option>
        <option value="spawn">Spawn (POST /run/spawn)</option>
      </select>
    </div>

    {#if mode === 'kv'}
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onclick={seed}
          class="text-[0.8125rem] border border-(--border) rounded-(--radius) px-3 py-1.5 bg-(--surface) hover:bg-(--surface-alt) cursor-pointer"
        >Seed demo KV</button>
        {#if seedMsg}
          <span class="text-[0.8125rem] text-(--text-2)">{seedMsg}</span>
        {/if}
      </div>
    {/if}

    {#if mode !== 'chain'}
      <div>
        <label for="compose-template" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5"
          >Guest template</label
        >
        <select
          id="compose-template"
          bind:value={guestTemplate}
          class="w-full max-w-xs border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem] text-(--text) font-(family-name:--mono)"
        >
          {#each GUEST_TEMPLATE_IDS as tid (tid)}
            <option value={tid}>{tid}</option>
          {/each}
        </select>
        <p class="text-[0.75rem] text-(--text-3) m-0 mt-1.5 max-w-[56ch]">
          Chain mode: set <code class="text-[0.7rem]">template</code> on each step in the JSON if needed.
        </p>
      </div>
    {/if}

    {#if mode === 'generate'}
      <fieldset class="border border-(--border) rounded-(--radius) p-3 space-y-1.5 text-[0.8125rem] text-(--text-2) mb-3">
        <legend class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) px-1">Generated code capabilities</legend>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capWorkersAi} /><code class="font-(family-name:--mono) text-[0.7rem]">workersAi</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capR2Read} /><code class="font-(family-name:--mono) text-[0.7rem]">r2Read</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capD1Read} /><code class="font-(family-name:--mono) text-[0.7rem]">d1Read</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capDurableObjectFetch} /><code class="font-(family-name:--mono) text-[0.7rem]">durableObjectFetch</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capContainerHttp} /><code class="font-(family-name:--mono) text-[0.7rem]">containerHttp</code></label>
      </fieldset>
      <div>
        <label for="compose-prompt" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Prompt</label>
        <textarea
          id="compose-prompt"
          bind:value={prompt}
          rows="4"
          class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-(family-name:--mono) text-xs text-(--text)"
        ></textarea>
      </div>
      <label class="flex items-center gap-2 text-[0.8125rem] text-(--text-2)">
        <input type="checkbox" bind:checked={capKvRead} />
        Grant <code class="font-(family-name:--mono) text-[0.75rem]">kvRead</code> to generated code
      </label>
    {:else if mode === 'chain'}
      <div>
        <label for="compose-chain" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Steps (JSON)</label>
        <textarea
          id="compose-chain"
          bind:value={chainJson}
          rows="12"
          class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-(family-name:--mono) text-xs text-(--text)"
        ></textarea>
      </div>
    {:else}
      <fieldset class="border border-(--border) rounded-(--radius) p-3 space-y-1.5 text-[0.8125rem] text-(--text-2) mb-3">
        <legend class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) px-1">Guest capabilities</legend>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capWorkersAi} /><code class="font-(family-name:--mono) text-[0.7rem]">workersAi</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capR2Read} /><code class="font-(family-name:--mono) text-[0.7rem]">r2Read</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capD1Read} /><code class="font-(family-name:--mono) text-[0.7rem]">d1Read</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capDurableObjectFetch} /><code class="font-(family-name:--mono) text-[0.7rem]">durableObjectFetch</code></label>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capContainerHttp} /><code class="font-(family-name:--mono) text-[0.7rem]">containerHttp</code></label>
      </fieldset>
      <div>
        <label for="compose-code" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Guest body</label>
        <textarea
          id="compose-code"
          bind:value={code}
          rows="10"
          class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-(family-name:--mono) text-xs text-(--text)"
        ></textarea>
      </div>
      {#if mode === 'spawn'}
        <div>
          <label for="compose-depth" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Max depth</label>
          <input
            id="compose-depth"
            type="number"
            bind:value={depth}
            min="1"
            max="8"
            class="w-24 border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem]"
          />
        </div>
      {/if}
    {/if}

    <button
      type="button"
      onclick={run}
      disabled={loading}
      class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--accent) text-white border border-(--accent) cursor-pointer disabled:opacity-50"
    >{loading ? 'Running…' : 'Run'}</button>

    {#if lastTraceId}
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem]">
        <div class="text-(--text-3) text-[0.6875rem] font-semibold uppercase tracking-wider mb-2">Trace</div>
        <a href="/t/{lastTraceId}" class="text-(--text) font-(family-name:--mono) text-xs underline underline-offset-2">/t/{lastTraceId}</a>
        <p class="mt-2 text-[0.75rem] text-(--text-3) m-0">
          Chain runs include a per-step breakdown.
          <AppLink to={paths.docsTraceSchema} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Trace schema</AppLink>.
        </p>
      </div>
    {/if}

    {#if lastError}
      <div class="rounded-(--radius) border border-(--cap-off-border) bg-(--cap-off-bg) p-4">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--cap-off-text) mb-2">Error</div>
        <pre class="font-(family-name:--mono) text-xs whitespace-pre-wrap text-(--text)">{lastError}</pre>
        <p class="mt-3 mb-0 text-[0.75rem] text-(--cap-off-text)">
          <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>
          — request shapes and run modes.
        </p>
      </div>
    {/if}
  </div>
</div>
