# Failures and traces

## Chain runs

On **success**, `POST /run/chain` returns a full per-step **`trace`** array (step index, bodies, inputs, outputs, wall **`ms`**). Persisted documents match the [trace schema](/docs/trace-schema).

On **failure** (any step’s isolate run fails or the Effect pipeline fails), the current Worker implementation still persists a trace document, but the **stored payload uses an empty `trace` array** in the failure branch: the sequential step array built during the loop is **not** attached when the chain aborts. Do not assume partial step visibility in **`GET /t/:id`** after a failed chain—verify behavior on your deployment.

Implementation reference: `onFailure` for `/run/chain` in [`worker/index.ts`](https://github.com/acoyfellow/lab/blob/main/worker/index.ts) (search for `trace: []` in the chain handler).

## Isolate error reasons

`IsolateError` in [`worker/Loader.ts`](https://github.com/acoyfellow/lab/blob/main/worker/Loader.ts) uses tagged **`reason`** values:

| `reason` | Typical cause |
|----------|----------------|
| `timeout` | Isolate or subrequest exceeded limits |
| `sandbox_violation` | Platform / loader restriction (e.g. “not permitted”) |
| `capability_denied` | Guest called a capability that was not granted |
| `runtime` | Syntax, thrown error, bad JSON, or other execution failure |

Responses and persisted **`outcome`** may include **`error`** / **`reason`** strings; exact shapes are documented under [Trace schema](/docs/trace-schema).

## See also

- [Limits](/docs/limits) — platform and repo-enforced bounds.
- [Architecture](/docs/architecture) — **Isolate identity, cache, and cold starts** (why timings differ between runs).
