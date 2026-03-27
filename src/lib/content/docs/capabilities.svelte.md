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
| `durableObjectFetch` | `LAB_DO` | `labDo.fetch(name, { method, path, body })` → `/invoke/do` | `DurableObjectFetch capability not granted`; **503** if DO unbound |
| `containerHttp` | `LAB_CONTAINER` (optional) | `labContainer.get(path)` → `/invoke/container` | `ContainerHttp capability not granted`; **503** if unbound |

Denied-capability errors and per-step I/O show up on **`/t/:id`**.

## What each capability is for

| Capability | Binding | What it is | Pros | Cons / caveats |
| --- | --- | --- | --- | --- |
| **`kvRead`** | `KV` | Point-in-time **snapshot** of the namespace into the isolate; guest uses `kv.get` / `kv.list` on that copy. | No live `KVNamespace` in Loader env; predictable read-only view for one run. | Stale vs live KV after snapshot; **no writes**; big prefixes can cost memory and time. |
| **`spawn`** | `SELF` | **Nested isolates** via `POST /spawn/child`; depth budget decreases each level. | Sandboxed recursion with a hard **depth cap**; same capability model at each level. | Hits depth at 0; extra round-trips; `/run/spawn` without the cap can **400**. |
| **`workersAi`** | `AI` | Guest `ai.run(prompt)`; host runs Workers AI on **`POST /invoke/ai`** (`SELF` outbound). | Keys stay on the host; guest never sees provider secrets. | **Cost / quota**; latency per call; policy is yours (prompts, limits). |
| **`r2Read`** | `R2` | Guest `r2.list` / `r2.getText`; host **`POST /invoke/r2`**. | Reads object storage without R2 credentials in guest code. | Read-focused API; **503** if R2 unbound; large listings can be slow. |
| **`d1Read`** | `ENGINE_D1` | Guest `d1.query(sql)` **read-only**; host **`POST /invoke/d1`**. | SQL from guest without a raw D1 binding in the Loader. | Read-only; **503** if D1 unbound; expose only SQL you trust (injection / heavy queries). |
| **`durableObjectFetch`** | `LAB_DO` | Guest calls into the bound Durable Object via host **`POST /invoke/do`** (method/path/body). | RPC-style DO access without handing guest the real binding. | **503** if unconfigured; in the default DO: `GET` reads storage by `path`, `POST|PUT|PATCH` stores JSON at `path`, `DELETE` removes. |
| **`containerHttp`** | `LAB_CONTAINER` (optional) | Guest **`POST /invoke/container`** for HTTP GET-style access to a bound **container** service. | Same leash model for heavier or non-Worker workloads. | Often **503** until you bind `LAB_CONTAINER`; more moving parts than Workers-only caps. |

<DocFooterNav
  gridClass="sm:grid-cols-2 lg:grid-cols-3"
  links={[
    { label: 'Compose', to: '/compose', description: 'Try modes and caps in the browser.' },
    { label: 'HTTP API', to: '/docs/http-api', description: 'Endpoints, curl, run modes.' },
    { label: 'Architecture', to: '/docs/architecture', description: 'Worker loaders, Effect, KV, spawn, chains.' },
  ]}
/>
