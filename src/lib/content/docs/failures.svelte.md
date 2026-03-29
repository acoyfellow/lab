# What happens when things fail

## Pipeline failures

If every step succeeds, the saved result includes full details for each step — code, inputs, outputs, and timing.

If a step fails, Lab still saves a result, but the per-step details may be incomplete. The step that failed will show an error and reason. Steps that didn't run won't appear.

**Don't assume you'll see partial results after a failure.** Check your deployment's behavior — the current implementation saves an empty step array when a pipeline aborts.

## Error reasons

When code fails, the error includes a `reason` that tells you what went wrong:

| Reason | What happened |
|---|---|
| `timeout` | The code took too long |
| `sandbox_violation` | The code tried something the platform doesn't allow |
| `capability_denied` | The code tried to use a permission it wasn't granted |
| `runtime` | Syntax error, thrown exception, bad JSON, or other code-level failure |

These show up in the saved result's `outcome` field, alongside the `error` message.

## See also

- [Limits](/docs/limits) — what gets capped and why
- [How Lab works](/docs/architecture) — why timing can vary between runs
