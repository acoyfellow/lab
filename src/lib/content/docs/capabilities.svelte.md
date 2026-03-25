<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# Capabilities

Capabilities control what code can do inside an isolate. They are implemented as shims injected into the isolate wrapper at spawn time.

**Without a capability:** the API (e.g. `kv`) is a `Proxy` that throws on access — e.g. `KvRead capability not granted`.

**With KV Read:** the parent snapshots KV into memory; the isolate reads that copy, not live KV or outbound calls.

**Spawn:** uses a `SELF` binding. `spawn()` fetches `POST /spawn/child`; depth decreases each level; at 0 the shim throws.

**Why snapshot KV?** `KVNamespace` cannot be serialized into Worker Loader env — snapshotting avoids that limit.

<DocFooterNav
  gridClass="sm:grid-cols-2"
  links={[
    { label: 'HTTP API', to: '/docs/http-api', description: 'Endpoints, curl, run modes.' },
    { label: 'Architecture', to: '/docs/architecture', description: 'Worker loaders, Effect, KV, spawn, chains.' },
  ]}
/>
