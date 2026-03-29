<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'the-concept', label: 'The Concept' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'key-benefits', label: 'Key Benefits' },
    { id: 'documentation', label: 'Documentation' },
    { id: 'try-it', label: 'Try It' },
  ];
</script>

<DocsArticle
  pageTitle="Petri"
  segment="Petri"
  description="Persistent substrate for Lab experiments with Durable Object-backed state."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight text-(--text)">Petri</h1>
    <p class="text-sm text-(--text-3)">
      Persistent substrate for Lab experiments. Agents inhabit state rather than generating it.
    </p>
  </header>

  <section id="the-concept" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">The Concept</h2>
    <p class="text-(--text-2) leading-relaxed">
      Traditional Lab workflows have agents generate code that <em>returns</em> a value. The host then manually applies
      that value to state. This is fragile—if the generated code has a syntax error, the whole tick fails.
    </p>
    <p class="text-(--text-2) leading-relaxed">
      <strong>Petri</strong> flips this: agents generate code that <em>calls methods</em> on a persistent substrate. The
      state lives in a Durable Object, survives page reloads, and broadcasts updates in real-time via WebSocket.
    </p>
  </section>

  <section id="architecture" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">Architecture</h2>
    <pre class="bg-(--code-bg) p-4 rounded-lg text-sm text-(--text-2) overflow-x-auto leading-normal font-mono whitespace-pre">  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │    Agent     │ ◄────► │   Sandbox    │ ◄────► │   Petri DO   │
  │    (Lab)     │        │  (labPetri)  │        │   (State)    │
  └──────────────┘        └──────────────┘        └──────┬───────┘
                                                          │
                                                    WS · observe
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │   Browser    │
                                                   │  (Observe)   │
                                                   └──────────────┘</pre>
    <ol class="list-decimal list-inside space-y-2 text-(--text-2)">
      <li>Agent code runs in Lab sandbox with labPetri binding</li>
      <li>Agent calls labPetri.mutate([...]) to modify state</li>
      <li>PetriDish DO validates mutations against schema</li>
      <li>DO applies mutations via pure reduce() function</li>
      <li>DO persists state and broadcasts to all WebSocket clients</li>
      <li>UI automatically updates with new state</li>
    </ol>
  </section>

  <section id="key-benefits" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">Key Benefits</h2>
    <ul class="list-disc list-inside space-y-2 text-(--text-2)">
      <li><strong>Persistence:</strong> State survives page reloads and deployments</li>
      <li><strong>Validation:</strong> Invalid mutations are rejected at the DO level</li>
      <li><strong>Real-time:</strong> WebSocket broadcasts to all connected clients</li>
      <li><strong>Robustness:</strong> Schema-enforced mutations prevent corruption</li>
      <li><strong>Observability:</strong> Full trace of agent actions via Lab</li>
    </ul>
  </section>

  <section id="documentation" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">Documentation</h2>
    <p class="text-(--text-2)">
      Full documentation is available in the
      <a href="https://github.com/acoyfellow/lab/tree/main/packages/lab-petri" class="text-(--accent) underline"
        >lab-petri package README</a
      >.
    </p>
  </section>

  <section id="try-it" class="space-y-4">
    <h2 class="text-xl font-semibold text-(--text)">Try It</h2>
    <p class="text-(--text-2)">
      See the <a href="/experiments/petri" class="text-(--accent) underline">Petri experiment</a> for a working Garden
      demo where agents tend plants on a persistent substrate.
    </p>
  </section>
</DocsArticle>
