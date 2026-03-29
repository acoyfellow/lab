# Permissions

By default, your code runs in a locked-down sandbox. It can compute, but it can't reach anything outside itself — no network, no storage, no AI. You unlock what it needs by adding permissions to the `capabilities` array.

If you don't grant a permission, the code gets a clear error: `"… capability not granted"`.

## Available permissions

| Permission | What your code can do | What happens if denied |
|---|---|---|
| `kvRead` | Read from KV storage (`kv.get`, `kv.list`) | `KvRead capability not granted` |
| `spawn` | Launch nested sandboxes (`spawn(code, caps)`) | `Spawn capability not granted` |
| `workersAi` | Call Cloudflare AI models (`ai.run(prompt)`) | `WorkersAi capability not granted` |
| `r2Read` | Read files from R2 storage (`r2.list`, `r2.getText`) | `R2Read capability not granted` |
| `d1Read` | Query a D1 database, read-only (`d1.query(sql)`) | `D1Read capability not granted` |
| `durableObjectFetch` | Call a Durable Object (`labDo.fetch(name, opts)`) | `DurableObjectFetch capability not granted` |
| `containerHttp` | HTTP access to a bound container service | `ContainerHttp capability not granted` |
| `fetch` | Make outbound HTTP requests | Network access blocked |

## How they work

**Permissions are additive.** Your code starts with nothing. You add what it needs.

**Permissions only narrow.** If your code spawns a nested sandbox, the child can have the same or fewer permissions — never more.

**KV is a snapshot.** When you use `kvRead`, Lab copies the current KV data into memory before your code runs. Your code reads from that copy. This means it's a point-in-time snapshot, not a live connection — if KV changes while your code runs, it won't see the update.

**AI, R2, D1, and Durable Objects use a proxy.** Your code calls a simple API (like `ai.run()`), and the host Worker handles the actual Cloudflare binding behind the scenes. Your code never sees credentials or raw bindings.

## What shows up in traces

Every permission error and every input/output is recorded. If a permission was denied, you'll see exactly which one and where. Open any run's URL to inspect it.
