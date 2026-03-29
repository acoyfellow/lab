# Limits and bounds

Lab does not re-implement every Cloudflare platform limit in code. **Account-level** quotas (CPU time, requests, subrequests) follow [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/). Below: **what this repo enforces or assumes** in the Worker.

## Guest runs

- **`body` / `code`:** non-empty string after trim; **`template`** must resolve to a known guest template (default `guest@v1`). See `parseGuestRunPayload` in [`worker/index.ts`](https://github.com/acoyfellow/lab/blob/main/worker/index.ts).
- **Syntax:** invalid guest JS fails before load with a **runtime** isolate error (same validation as [`src/lib/guest-code.test.ts`](https://github.com/acoyfellow/lab/blob/main/src/lib/guest-code.test.ts)).

## Chains

- **`normalizeChainSteps`** accepts any **non-empty** array of valid steps. There is **no explicit max step count** in this codebase.
- Practical caps: **Worker CPU time**, **request duration**, and **Loader** behavior. Very long chains or heavy steps can hit platform limits or timeouts.

## R2 invoke (`POST /invoke/r2`)

When the R2 capability is used, list requests cap **`limit`** at **1000** (default request uses `500` if omitted). **`getText`** caps **`maxBytes`** at **1 MiB** (default `262144`). See [`worker/index.ts`](https://github.com/acoyfellow/lab/blob/main/worker/index.ts) `/invoke/r2` handler.

## KV snapshot

KV read for isolates uses a **full list + get** snapshot in [`worker/Loader.ts`](https://github.com/acoyfellow/lab/blob/main/worker/Loader.ts). Namespace size and [KV `list` behavior](https://developers.cloudflare.com/kv/api/list-keys/) follow Cloudflare’s documented limits.

## Request / response size

Total HTTP body sizes for `POST /run*` are bounded by **Workers request limits** (see Cloudflare docs). This site does not add a separate JSON size cap in front of that.

## See also

- [Architecture](/docs/architecture) — **Isolate identity, cache, and cold starts** (why wall `ms` varies run-to-run).
