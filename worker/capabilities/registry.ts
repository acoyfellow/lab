/**
 * Single source of truth for guest capability ids and deny copy.
 * Bindings come from deploy (Alchemy/Wrangler); this registry defines the guest contract.
 */
export const CAP_IDS = [
  "kvRead",
  "spawn",
  "workersAi",
  "r2Read",
  "d1Read",
  "durableObjectFetch",
  "containerHttp",
] as const

export type LabCapabilityId = (typeof CAP_IDS)[number]

export type CapabilityRegistryEntry = {
  id: LabCapabilityId
  /** Cloudflare binding used on the host (informational). */
  binding: string
  summary: string
  denyGuestMessage: string
  /** Short line for Workers AI / codegen system prompts (stub contract). */
  llmHint: string
}

export const CAPABILITY_REGISTRY: readonly CapabilityRegistryEntry[] = [
  {
    id: "kvRead",
    binding: "KV",
    summary: "Point-in-time KV snapshot: kv.get / kv.list in the isolate.",
    denyGuestMessage: "KvRead capability not granted",
    llmHint: "`kv.get(key)` / `kv.list(prefix?)` — async, snapshot KV.",
  },
  {
    id: "spawn",
    binding: "SELF",
    summary: "Nested isolates via POST /spawn/child; depth decreases each level.",
    denyGuestMessage: "Spawn capability not granted",
    llmHint: "`spawn(bodyString, capabilities[])` — async nested isolate (string body for child).",
  },
  {
    id: "workersAi",
    binding: "AI",
    summary: "Workers AI text via host POST /invoke/ai; guest calls ai.run(prompt).",
    denyGuestMessage: "WorkersAi capability not granted",
    llmHint: "`ai.run(prompt)` — async, returns model text via host Workers AI.",
  },
  {
    id: "r2Read",
    binding: "R2",
    summary: "R2 read/list via host POST /invoke/r2; guest calls r2.list / r2.getText.",
    denyGuestMessage: "R2Read capability not granted",
    llmHint: "`r2.list(prefix?, limit?)` / `r2.getText(key, maxBytes?)` — async R2 reads.",
  },
  {
    id: "d1Read",
    binding: "ENGINE_D1",
    summary: "Read-only D1 via host POST /invoke/d1; guest calls d1.query(sql).",
    denyGuestMessage: "D1Read capability not granted",
    llmHint: "`d1.query(sql)` — async, read-only SELECT against engine D1.",
  },
  {
    id: "durableObjectFetch",
    binding: "LAB_DO",
    summary: "RPC into a Durable Object via POST /invoke/do (method/path/body).",
    denyGuestMessage: "DurableObjectFetch capability not granted",
    llmHint: "`labDo.fetch(name, { method, path, body })` — async Durable Object JSON.",
  },
  {
    id: "containerHttp",
    binding: "LAB_CONTAINER",
    summary: "HTTP GET to the bound container via POST /invoke/container.",
    denyGuestMessage: "ContainerHttp capability not granted",
    llmHint: "`labContainer.get(path)` — async HTTP GET to bound container (if configured).",
  },
] as const

export function denyMessageFor(cap: LabCapabilityId): string {
  const row = CAPABILITY_REGISTRY.find((c) => c.id === cap)
  return row?.denyGuestMessage ?? `${cap} capability not granted`
}
