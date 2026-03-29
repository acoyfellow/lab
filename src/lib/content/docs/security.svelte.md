# Security model

This page is a **framing** for operators and integrators—not a formal audit.

## Untrusted guest code

Guest **bodies** are treated as **untrusted JavaScript**. They run inside **Worker Loader** child isolates with a fixed template shell. What they can reach is **only** what you declare via [capabilities](/docs/capabilities).

## Capabilities

- **No capability ⇒ no shim.** Without `kvRead`, the guest does not get KV helpers. Without `spawn`, spawn throws. Without invoke-backed caps, those shims are absent.
- Capabilities are **strings** on each run; the host builds `CapabilitySet` and composes the guest module **before** execution.

## KV snapshot

KV is injected as a **point-in-time** in-memory snapshot, not a live binding. Stale reads are possible if the namespace changes between snapshot and run. Details: [Architecture — How KV read works](/docs/architecture#how-kv-read-works-without-a-binding).

## Host invoke (`/invoke/*`)

Capabilities that need real bindings (AI, R2, D1, etc.) call **narrow** `POST /invoke/*` routes on the parent Worker. Misconfiguration surfaces as **503** or isolate errors—not silent access. Operators control which bindings exist in `env`.

## Operators

**You** own Cloudflare account security, secrets, API tokens, and what runs in the parent Worker. Lab documents **mechanism**; it does not guarantee a compliance regime by itself.
