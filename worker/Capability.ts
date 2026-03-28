import { Effect, ServiceMap } from "effect"

// Each capability is a service. If it's not in the Layer, the isolate can't use it.

export class KvRead extends ServiceMap.Service<
  KvRead,
  {
    readonly get: (key: string) => Effect.Effect<string | null>
    readonly list: (prefix?: string) => Effect.Effect<string[]>
  }
>()("@lab/KvRead") {}

/** What you pass to an isolate. Only included keys get injected / host invoke enabled. */
export type CapabilitySet = {
  kvRead?: ServiceMap.Service.Shape<typeof KvRead>
  spawn?: { depth: number }
  workersAi?: true
  r2Read?: true
  d1Read?: true
  durableObjectFetch?: true
  containerHttp?: true
  petri?: true
}
