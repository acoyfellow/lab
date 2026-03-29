# Limits

Lab runs on Cloudflare Workers. Most limits come from the platform itself — [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) apply to CPU time, request size, and subrequests.

Here's what Lab adds on top:

## Code

- **`body` must be a non-empty string.** Whitespace-only strings are rejected.
- **Must be valid JavaScript.** Syntax errors fail the run immediately.

## Pipelines

- **No explicit step limit.** You can have as many steps as you want, but long pipelines will eventually hit Cloudflare's CPU time or request duration limits.

## R2 storage reads

- **List requests:** capped at 1,000 items (default 500)
- **File reads (`getText`):** capped at 1 MB (default 256 KB)

## KV storage reads

KV data is copied into memory before your code runs. Very large KV namespaces will use more memory and take longer to load. Cloudflare's [KV list behavior](https://developers.cloudflare.com/kv/api/list-keys/) applies.

## Request size

HTTP body size follows Cloudflare Workers limits. Lab doesn't add a separate cap.
