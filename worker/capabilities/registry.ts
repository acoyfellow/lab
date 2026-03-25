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
}

export const CAPABILITY_REGISTRY: readonly CapabilityRegistryEntry[] = [
  {
    id: "kvRead",
    binding: "KV",
    summary: "Point-in-time KV snapshot: kv.get / kv.list in the isolate.",
    denyGuestMessage: "KvRead capability not granted",
  },
  {
    id: "spawn",
    binding: "SELF",
    summary: "Nested isolates via POST /spawn/child; depth decreases each level.",
    denyGuestMessage: "Spawn capability not granted",
  },
  {
    id: "workersAi",
    binding: "AI",
    summary: "Workers AI text via host POST /invoke/ai; guest calls ai.run(prompt).",
    denyGuestMessage: "WorkersAi capability not granted",
  },
  {
    id: "r2Read",
    binding: "R2",
    summary: "R2 read/list via host POST /invoke/r2; guest calls r2.list / r2.getText.",
    denyGuestMessage: "R2Read capability not granted",
  },
  {
    id: "d1Read",
    binding: "ENGINE_D1",
    summary: "Read-only D1 via host POST /invoke/d1; guest calls d1.query(sql).",
    denyGuestMessage: "D1Read capability not granted",
  },
  {
    id: "durableObjectFetch",
    binding: "LAB_DO",
    summary: "Fetch a stub Durable Object by name/path via POST /invoke/do.",
    denyGuestMessage: "DurableObjectFetch capability not granted",
  },
  {
    id: "containerHttp",
    binding: "LAB_CONTAINER",
    summary: "HTTP GET to the bound container via POST /invoke/container.",
    denyGuestMessage: "ContainerHttp capability not granted",
  },
] as const

export function denyMessageFor(cap: LabCapabilityId): string {
  const row = CAPABILITY_REGISTRY.find((c) => c.id === cap)
  return row?.denyGuestMessage ?? `${cap} capability not granted`
}
