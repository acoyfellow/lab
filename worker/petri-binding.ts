import { WorkerEntrypoint } from "cloudflare:workers"

interface PetriProps {
  dishId: string
}

interface PetriEnv {
  PETRI_DO?: DurableObjectNamespace
}

/**
 * RPC binding for Petri dish access from sandboxed dynamic workers.
 * 
 * This class is exported from the parent worker and passed to dynamic
 * workers via env.PETRI. The sandboxed agent can call:
 * 
 *   await this.env.PETRI.mutate([{ type: "grow", target: "plant-1" }])
 *   await this.env.PETRI.getState()
 * 
 * The binding forwards calls to the PETRI_DO Durable Object.
 */
export class PetriBinding extends WorkerEntrypoint<PetriEnv, PetriProps> {
  async mutate(mutations: unknown[]): Promise<unknown> {
    const { dishId } = this.ctx.props
    const env = this.env as { PETRI_DO?: DurableObjectNamespace }
    
    if (!env.PETRI_DO) {
      throw new Error("PETRI_DO binding not available")
    }
    
    const id = env.PETRI_DO.idFromName(dishId)
    const stub = env.PETRI_DO.get(id)
    
    const response = await stub.fetch(
      new Request(`http://internal/petri/${dishId}/mutate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mutations }),
      })
    )
    
    const data = await response.json() as { ok: boolean; error?: string; snapshot?: unknown }
    if (!data.ok) {
      throw new Error(data.error || "petri mutate failed")
    }
    return data.snapshot
  }

  async getState(): Promise<unknown> {
    const { dishId } = this.ctx.props
    const env = this.env as { PETRI_DO?: DurableObjectNamespace }
    
    if (!env.PETRI_DO) {
      throw new Error("PETRI_DO binding not available")
    }
    
    const id = env.PETRI_DO.idFromName(dishId)
    const stub = env.PETRI_DO.get(id)
    
    const response = await stub.fetch(
      new Request(`http://internal/petri/${dishId}/snapshot`, {
        method: "GET",
      })
    )
    
    const data = await response.json() as { ok: boolean; error?: string; state?: unknown }
    if (!data.ok) {
      throw new Error(data.error || "petri getState failed")
    }
    return data.state
  }
}
