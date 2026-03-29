<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'why-use-it', label: 'Why use it' },
    { id: 'documentation', label: 'Documentation' },
    { id: 'try-it', label: 'Try it' },
  ];
</script>

<DocsArticle
  pageTitle="Petri"
  segment="Petri"
  description="Persistent shared state that agents can read, modify, and observe in real-time."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight text-(--text)">Petri</h1>
    <p class="text-(--text-3) leading-relaxed max-w-2xl">
      Shared state that persists across runs. Agents modify it. Browsers observe it in real-time.
    </p>
  </header>

  <section id="how-it-works" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">How it works</h2>
    <p class="text-(--text-2) leading-relaxed">
      In a normal Lab run, your code returns a value and that's it — the sandbox disappears.
      With Petri, there's a shared state that lives outside the sandbox. Your code can read it,
      modify it, and the changes stick around for the next run.
    </p>
    <p class="text-(--text-2) leading-relaxed">
      Browsers can connect via WebSocket and see changes as they happen. This makes it possible
      to build things like live dashboards, collaborative experiments, or games where agents
      make moves and humans watch.
    </p>
    <pre class="docs-pre bg-(--code-bg) p-4 rounded-lg text-(--text-2) overflow-x-auto leading-normal font-mono whitespace-pre">  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │    Agent     │ ◄────► │   Sandbox    │ ◄────► │  Shared State │
  │              │        │  (Lab run)   │        │  (Durable Obj)│
  └──────────────┘        └──────────────┘        └──────┬───────┘
                                                          │
                                                     WebSocket
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │   Browser    │
                                                   │  (live view) │
                                                   └──────────────┘</pre>
    <ol class="list-decimal list-inside space-y-2 text-(--text-2)">
      <li>Agent code runs in a Lab sandbox with Petri access</li>
      <li>Code calls <code>labPetri.mutate([...])</code> to change the shared state</li>
      <li>Changes are validated against a schema</li>
      <li>Valid changes are applied and saved</li>
      <li>All connected browsers get the update instantly via WebSocket</li>
    </ol>
  </section>

  <section id="why-use-it" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">Why use it</h2>
    <ul class="list-disc list-inside space-y-2 text-(--text-2)">
      <li><strong>State persists</strong> — survives page reloads and new deployments</li>
      <li><strong>Validation</strong> — invalid changes are rejected before they're applied</li>
      <li><strong>Real-time</strong> — browsers see changes as they happen</li>
      <li><strong>Safe</strong> — agents can only modify state through validated mutations, not overwrite it</li>
    </ul>
  </section>

  <section id="documentation" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">Documentation</h2>
    <p class="text-(--text-2)">
      Full documentation is in the
      <a href="https://github.com/acoyfellow/lab/tree/main/packages/lab-petri" class="text-(--accent) underline"
        >lab-petri package README</a
      >.
    </p>
    <p class="text-(--text-2)">
      Install: <code>npm install @acoyfellow/lab-petri</code>
    </p>
  </section>

  <section id="try-it" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">Try it</h2>
    <p class="text-(--text-2)">
      See the <a href="/experiments/petri" class="text-(--accent) underline">Garden experiment</a> — a live demo where agents tend plants on shared, persistent state.
    </p>
  </section>
</DocsArticle>
