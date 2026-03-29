# Saved result document schema

Canonical narrative + tables: [`src/lib/content/docs/result-schema.svelte.md`](../src/lib/content/docs/result-schema.svelte.md) (rendered at `/docs/result-schema`).

## Summary

- **Storage:** KV key `result:<id>`; **`id`** is 10 hex chars (UUID slice).
- **Fetch:** `GET /results/:id.json` is the canonical machine JSON. `GET /results/:id` is the human viewer over that same saved result.
- **Guest runs** persist **`template`** (e.g. `guest@v1`) and **`body`** (JavaScript inserted into the host shell). Legacy payloads may still show **`code`** only; readers should treat `body ?? code` as the guest source.

## `request` shapes (by `type`)

| `type` | `request` fields |
|--------|------------------|
| `sandbox` | `template`, `body`, `capabilities?` (legacy: `code`) |
| `kv` | same as sandbox; `capabilities` always includes `kvRead` |
| `chain` | `steps[]` with `template`, `body`, `capabilities`, optional `name`, `props`, `input` |
| `generate` | `template`, `prompt`, `capabilities` |
| `spawn` | `template`, `body`, `capabilities`, `depth?` |

## `steps[]` (chain)

Each entry may include **`template`** and **`body`** for the step isolate, plus **`step`**, **`name`**, **`capabilities`**, **`input`**, **`output`**, **`ms`**.
