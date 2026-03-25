# Trace document schema

Canonical narrative + tables: [`src/lib/content/docs/trace-schema.svelte.md`](../src/lib/content/docs/trace-schema.svelte.md) (rendered at `/docs/trace-schema`).

## Summary

- **Storage:** KV key `trace:<id>`; **`id`** is 10 hex chars (UUID slice).
- **Fetch:** `GET /t/:id` (Worker or app proxy) and `GET /t/:id.json` (SvelteKit) return the same JSON.
- **Guest runs** persist **`template`** (e.g. `guest@v1`) and **`body`** (JavaScript inserted into the host shell). Legacy traces may still show **`code`** only; readers should treat `body ?? code` as the guest source.

## `request` shapes (by `type`)

| `type` | `request` fields |
|--------|------------------|
| `sandbox` | `template`, `body`, `capabilities?` (legacy: `code`) |
| `kv` | same as sandbox; `capabilities` always includes `kvRead` |
| `chain` | `steps[]` with `template`, `body`, `capabilities`, optional `name`, `props`, `input` |
| `generate` | `template`, `prompt`, `capabilities` |
| `spawn` | `template`, `body`, `capabilities`, `depth?` |

## `trace[]` (chain)

Each entry may include **`template`** and **`body`** for the step isolate, plus **`step`**, **`name`**, **`capabilities`**, **`input`**, **`output`**, **`ms`**.
