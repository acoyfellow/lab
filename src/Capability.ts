import { Context, Effect } from "effect"

// Each capability is a service. If it's not in the Layer, the isolate can't use it.

export class KvRead extends Context.Tag("@lab/KvRead")<
  KvRead,
  {
    readonly get: (key: string) => Effect.Effect<string | null>
    readonly list: (prefix?: string) => Effect.Effect<string[]>
  }
>() {}

// What you pass to an isolate. Only the capabilities you include get injected.
export type CapabilitySet = {
  readonly kvRead?: Context.Tag.Service<typeof KvRead>
}
