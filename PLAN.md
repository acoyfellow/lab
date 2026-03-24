# lab plan

## product direction

`lab` becomes a trace-first product.

The primary object is not a tab, endpoint, or homepage. It is a run artifact: a trace showing what code ran, what capabilities it had, what happened, and what came out.

The current five modes stay, but as examples/presets:

- Sandbox
- KV Read
- Chain
- Generate
- Spawn

They should teach and seed usage, not define the main information architecture.

## problem statement

Today `lab` is strongest as a concept demo:

- the homepage is organized as five tabs
- most runs dump JSON into a generic output box
- only chain has a real trace view
- there is no durable artifact to share

That makes the product easy to try once, but weak to revisit, link, cite, or embed.

## product thesis

People will share and revisit traces, not tabs.

The best artifact is a permalink to a specific run:

- exact code or prompt
- exact capabilities
- exact output
- exact timing
- exact orchestration structure

This should be understandable in seconds by someone who did not create it.

## design principles

1. Trace is the object
   - Every meaningful run should produce a trace.
   - The viewer should feel like a durable artifact, not debug output.

2. Examples are onboarding, not product structure
   - Existing phases remain useful.
   - They move behind examples/presets/tutorial framing.

3. Capabilities stay visible
   - What code can do should always be legible.
   - Capability boundaries are part of the product value.

4. One visual grammar across all modes
   - Sandbox, KV, Chain, Generate, and Spawn should all resolve to the same trace mental model.
   - Each mode can specialize the presentation, but not invent a new product shape.

5. Shareability beats more surface area
   - A shared run is more valuable than another demo tab.
   - New top-level sections need a clear artifact or workflow payoff.

6. Keep it simple
   - No accounts unless proven necessary.
   - No speculative collaboration features.
   - No new abstraction unless it directly improves sharing, reading, or composing traces.

## target user outcomes

Users should be able to:

- understand the capability model quickly
- run or inspect an example without reading much
- share a specific run with a short link
- read a trace and understand what happened
- compose their own run after seeing examples
- fork an existing trace into a new run

## information architecture direction

Do not grow the current tab bar into more phases.

Preferred top-level structure:

- Explore
- Compose
- Traces
- Docs

Meaning:

- Explore: examples, presets, tutorials, authored starting points
- Compose: write code or prompts, configure capabilities, run
- Traces: durable trace viewer, later gallery/directory
- Docs: API reference, architecture, capability model, deployment

Safer incremental structure if needed:

- Examples
- Compose
- Viewer

## homepage direction

The homepage should move from "textarea playground with tabs" to "product overview with a primary compose/share path."

Target sections:

1. Hero
   - one-line value prop
   - primary CTA to compose
   - secondary CTA to example traces

2. Core primitives
   - isolates
   - capabilities
   - traces

3. Example runs
   - sandbox
   - kv read
   - chain
   - generate
   - spawn

4. Trace anatomy
   - code or prompt
   - capabilities
   - result
   - timing
   - structure

5. API/docs links
   - routes
   - architecture
   - GitHub
   - self-host/deploy

## roadmap

### phase 1: shareable trace foundation

Goal:

Make every run produce a durable artifact.

Scope:

- define a trace schema shared across run types
- persist traces in KV with a short id
- return `traceId` from run endpoints
- add a read-only trace viewer route
- add share affordance in UI

Acceptance criteria:

- every successful run returns a `traceId`
- a trace URL renders without requiring editor context
- viewer shows enough information to understand the run by itself
- trace URLs can be copied and opened directly

Notes:

- start without auth
- use expiry only if cost needs it
- keep viewer read-only

### phase 2: unify trace rendering

Goal:

Make all modes feel like one product.

Scope:

- define common trace sections
- add mode-specific rendering patterns:
  - sandbox: code, caps, result, timing
  - kv read: code, caps, result, timing, snapshot note
  - chain: ordered pipeline
  - generate: prompt -> generated code -> result
  - spawn: tree view with depth and children
- reduce raw JSON dumping in UI

Acceptance criteria:

- all five modes render into trace-shaped output
- users can compare different run types with the same mental model
- capability visibility is consistent

### phase 3: trace-first homepage

Goal:

Restructure the product shell around traces and composition.

Scope:

- replace phase-first tab framing on the homepage
- add clearer hero and information hierarchy
- surface examples as cards/presets
- surface trace viewer as a first-class destination

Acceptance criteria:

- homepage communicates product value without requiring interaction first
- examples feel secondary to the trace object
- nav reflects user goals, not internal implementation phases

### phase 4: compose mode

Goal:

Turn the product into a real tool, not just a viewer.

Scope:

- editor/workspace for custom code
- capability picker
- prompt mode for generate
- run inline, then open/share resulting trace

Acceptance criteria:

- user can create a custom run without editing source code
- result always resolves to a trace
- compose flow is simpler than using the raw API

### phase 5: fork from trace

Goal:

Make traces generative, not just inspectable.

Scope:

- fork button from trace viewer
- hydrate compose view from trace contents
- preserve code/prompt/capabilities as starting point

Acceptance criteria:

- any trace can seed a new run
- viewer -> compose is one click
- examples can also be implemented as forkable traces

### phase 6: trace API and external use

Goal:

Make traces useful beyond the UI.

Scope:

- machine-readable trace route
- stable trace schema docs
- easy embedding/citation path

Acceptance criteria:

- traces can be fetched as JSON
- schema is documented
- other tools can consume trace artifacts directly

### phase 7: examples/gallery

Goal:

Create a public browsing surface for good traces.

Scope:

- curated example traces
- categories by capability/pattern
- later, public directory if warranted

Acceptance criteria:

- new users can browse representative traces quickly
- examples reinforce product value, not distract from it

## execution order

Work one active item at a time, but keep the larger list visible.

Recommended order:

1. trace schema
2. trace persistence
3. trace viewer route
4. share button and URL handling
5. unified render treatment for all run types
6. homepage IA refresh
7. compose workspace
8. fork from trace
9. trace JSON route
10. curated example gallery

## current repo implications

Based on the current code:

- `src/index.ts` already has the natural integration point for trace creation because all run routes terminate there
- `Chain` already exposes a trace structure and is the best seed for the shared schema
- `src/ui.html` currently centers the tab model and generic output panel, so that file will likely absorb most early product-shell changes
- `README.md` and `ARCHITECTURE.md` already contain the right raw concepts, but they are framed as implementation/docs rather than product narrative

## open product questions

Questions to answer before or during phase 1:

1. Should traces expire by default?
2. Should failed runs get trace ids too?
3. Should traces store full input/output always, or truncate in storage only in rendering?
4. Do we want example traces to be authored by code in repo or seeded into storage?
5. Does the share URL point to HTML only, or HTML plus JSON from day one?
6. How opinionated should the trace schema be about mode-specific fields?

## anti-goals

Avoid:

- adding more primary tabs/phases as the main product move
- adding accounts before shareability proves value
- building collaborative features before trace viewing/forking exists
- building a complex editor before the trace object is solid
- over-designing a gallery before trace URLs are actually useful

## review checklist

Use this to evaluate future changes:

### product

- Does this strengthen the trace as the main artifact?
- Does this make the product more useful to revisit or share?

### UX

- Is capability visibility preserved?
- Is the result understandable without reading code first?
- Does the UI feel like artifact viewing, not debug output?

### IA

- Is navigation organized around user goals?
- Are examples clearly examples, not the entire product?

### implementation

- Does this reuse the existing route architecture simply?
- Does this avoid speculative abstraction?
- Does this keep the path to compose/fork straightforward?

## operating model

Preferred way to work:

- maintain this larger prioritized plan in Markdown
- keep only one active implementation item at a time
- re-rank when new evidence appears
- avoid drifting into unrelated polish not justified by the plan

## immediate next item

Start with phase 1, specifically:

1. define trace schema
2. persist traces
3. add viewer route
4. return `traceId`
5. add share button
