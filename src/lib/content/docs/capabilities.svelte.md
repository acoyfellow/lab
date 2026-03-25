<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# Capabilities

Capabilities control what code can do inside an isolate. They are implemented as shims injected into the isolate wrapper at spawn time. Canonical strings live in `worker/capabilities/registry.ts`.

**Without a capability:** the API is a `Proxy` that throws — messages use the `… capability not granted` pattern so traces can record `reason: capability_denied`.

**KV read:** the parent snapshots KV into memory; the isolate reads that copy.

**Host invoke:** `workersAi`, `r2Read`, `d1Read`, `durableObjectFetch`, and `containerHttp` enable `SELF` outbound; guest code calls `fetch("http://internal/invoke/…")` and the host runs privileged bindings.

**Spawn:** `spawn()` fetches `POST /spawn/child`; depth decreases each level; at 0 the shim throws.

**Why snapshot KV?** `KVNamespace` cannot be serialized into Worker Loader env — snapshotting avoids that limit.

## Catalog

| String | Binding | If granted | If missing / denied |
| --- | --- | --- | --- |
| `kvRead` | `KV` | `kv.get` / `kv.list` on snapshot | `KvRead capability not granted` |
| `spawn` | `SELF` | Nested isolates via `/spawn/child` | **400** on `/run/spawn` without it; or `Spawn capability not granted` |
| `workersAi` | `AI` | `ai.run(prompt)` → `/invoke/ai` | `WorkersAi capability not granted` |
| `r2Read` | `R2` | `r2.list` / `r2.getText` → `/invoke/r2` | `R2Read capability not granted`; **503** if R2 unbound |
| `d1Read` | `ENGINE_D1` | `d1.query(sql)` read-only → `/invoke/d1` | `D1Read capability not granted`; **503** if D1 unbound |
| `durableObjectFetch` | `LAB_DO` | `labDo.fetch(name, path)` → `/invoke/do` | `DurableObjectFetch capability not granted`; **503** if DO unbound |
| `containerHttp` | `LAB_CONTAINER` (optional) | `labContainer.get(path)` → `/invoke/container` | `ContainerHttp capability not granted`; **503** if unbound |

Denied-capability errors and per-step I/O show up on **`/t/:id`**.

<DocFooterNav
  gridClass="sm:grid-cols-2 lg:grid-cols-3"
  links={[
    { label: 'Compose', to: '/compose', description: 'Try modes and caps in the browser.' },
    { label: 'HTTP API', to: '/docs/http-api', description: 'Endpoints, curl, run modes.' },
    { label: 'Architecture', to: '/docs/architecture', description: 'Worker loaders, Effect, KV, spawn, chains.' },
  ]}
/>
