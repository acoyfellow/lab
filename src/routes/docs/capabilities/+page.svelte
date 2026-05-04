<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'available-capabilities', label: 'Available capabilities' },
    { id: 'how-they-work', label: 'How they work' },
    { id: 'results', label: 'Receipts' },
  ];
</script>

<DocsArticle
  pageTitle="Capabilities"
  segment="Capabilities"
  description="Supported capability IDs, what they unlock, and what denial looks like."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-3">
    <h1 class="text-2xl font-semibold tracking-tight">Capabilities</h1>
    <p class="leading-relaxed">
      By default, guest code runs in a locked-down sandbox. It can compute, but it cannot reach KV, AI, R2, D1,
      Durable Objects, containers, or Petri unless you grant the matching capability ID.
    </p>
  </header>

  <section id="available-capabilities" class="space-y-4">
    <h2 class="text-lg font-semibold">Available capabilities</h2>
    <div class="rounded-(--radius) border border-(--border) overflow-hidden">
      <table class="w-full text-[0.875rem]">
        <thead class="bg-(--surface-alt)">
          <tr>
            <th class="text-left px-4 py-2 font-semibold text-(--text-3)">Capability</th>
            <th class="text-left px-4 py-2 font-semibold text-(--text-3)">What guest code can do</th>
            <th class="text-left px-4 py-2 font-semibold text-(--text-3)">Denied error</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--border)">
          {#each data.capabilities as capability}
            <tr class="bg-(--surface)">
              <td class="px-4 py-3 align-top font-medium text-(--text)">
                <div class="flex items-center gap-2">
                  <code class="font-mono text-[0.8125rem]">{capability.id}</code>
                  {#if capability.experimental}
                    <span class="text-[0.625rem] px-1.5 py-0.5 rounded-full bg-(--surface-alt) text-(--text-3)">
                      Experimental
                    </span>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3 align-top text-(--text-2)">{capability.summary}</td>
              <td class="px-4 py-3 align-top text-(--text-2)">
                <code class="font-mono text-[0.8125rem]">{capability.denyMessage}</code>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section id="how-they-work" class="space-y-3">
    <h2 class="text-lg font-semibold">How they work</h2>
    <p>
      Capabilities are additive. Guest code starts with nothing, and each run or chain step only gets the capability
      IDs you pass.
    </p>
    <p>
      Capabilities only narrow. A spawned child can get the same or fewer capabilities than its parent, never more.
    </p>
    <p>
      KV is a point-in-time snapshot. AI, R2, engine D1, Durable Objects, containers, and Petri are all host-backed
      shims that keep privileged bindings on the parent Worker.
    </p>
  </section>

  <section id="results" class="space-y-3">
    <h2 class="text-lg font-semibold">Receipts</h2>
    <p>
      Receipts always record the top-level request and outcome. Successful chain runs include full per-step data.
      Failed or aborted runs still include the top-level error and reason, but the per-step data may be partial or
      empty depending on where execution stopped.
    </p>
  </section>
</DocsArticle>
