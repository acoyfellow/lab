# Capabilities

Capabilities control what code can do inside an isolate. They are implemented as shims injected into the isolate wrapper at spawn time.

**Without a capability:** the API (e.g. `kv`) is a `Proxy` that throws on access — e.g. `KvRead capability not granted`.

**With KV Read:** the parent snapshots KV into memory; the isolate reads that copy, not live KV or outbound calls.

**Spawn:** uses a `SELF` binding. `spawn()` fetches `POST /spawn/child`; depth decreases each level; at 0 the shim throws.

**Why snapshot KV?** `KVNamespace` cannot be serialized into Worker Loader env — snapshotting avoids that limit.

[HTTP API](/docs/http-api) · [Architecture](/docs/architecture)
