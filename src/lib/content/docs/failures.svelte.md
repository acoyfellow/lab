# What happens when things fail

## Pipeline failures

If every step succeeds, the receipt includes full details for each step — code, inputs, outputs, and timing.

If a step fails, Lab still saves a result, but the per-step details may be incomplete. Failed or aborted runs always include the top-level `error` and `reason`. The chain `steps` array may be partial or empty depending on where execution stopped.

**Don't assume you'll see partial results after a failure.** Check your deployment's behavior — the current implementation saves an empty step array when a pipeline aborts.

## Error reasons

When code fails, the error includes a `reason` that tells you what went wrong:

| Reason | What happened |
|---|---|
| `timeout` | The code took too long |
| `sandbox_violation` | The code tried something the platform doesn't allow |
| `capability_denied` | The code tried to use a permission it wasn't granted |
| `runtime` | Syntax error, thrown exception, bad JSON, or other code-level failure |

These show up in the receipt's `outcome` field, alongside the `error` message.

## See also

- [Limits](/docs/limits) — what gets capped and why
- [How Lab works](/docs/architecture) — why timing can vary between runs
